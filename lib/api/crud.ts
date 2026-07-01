import { revalidateTag, unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { dashboardTag, listTag } from "@/lib/cache-tags";
import { parseBody } from "./json";
import { requireUserId } from "./session";

/**
 * Structural view of a Prisma model delegate. The argument/return types are
 * intentionally loose (`any`): every generated delegate has model-specific
 * types, and this generic layer treats them uniformly. Type safety for the
 * data shape is recovered through the Zod schemas and `serialize` hook below.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic over heterogeneous Prisma delegates
type Row = any;

export interface PrismaModelDelegate {
  findMany(args: unknown): Promise<Row[]>;
  create(args: unknown): Promise<Row>;
  update(args: unknown): Promise<Row>;
  delete(args: unknown): Promise<Row>;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export interface CrudOptions<TCreate, TUpdate> {
  /**
   * Stable resource name used to key the cached list read and its
   * invalidation tag, e.g. `"task"`. Must be unique per model.
   */
  resource: string;
  /** The Prisma delegate, e.g. `prisma.note`. */
  delegate: PrismaModelDelegate;
  /** Schema applied to POST bodies. */
  createSchema: ZodType<TCreate>;
  /** Schema applied to PUT/PATCH bodies (often the create schema `.partial()`). */
  updateSchema: ZodType<TUpdate>;
  /** Prisma `orderBy` used when listing. */
  orderBy?: unknown;
  /** Prisma `include` used on every read/write that returns a row. */
  include?: unknown;
  /** Transform a row before it is serialized to JSON (e.g. Decimal -> number). */
  serialize?: (row: Row) => unknown;
  /** Build the `data` for a create. Defaults to `{ ...input, userId }`. */
  toCreateData?: (input: TCreate, userId: string) => Record<string, unknown>;
  /** Build the `data` for an update. Defaults to `{ ...input }`. */
  toUpdateData?: (input: TUpdate) => Record<string, unknown>;
}

/**
 * Build the four standard user-scoped CRUD handlers for a resource. All access
 * is filtered by `userId` (relying on Prisma's extended-where-unique to prevent
 * cross-user access on update/delete). Wrap each with `route()` when exporting.
 */
export function crudHandlers<TCreate, TUpdate>(opts: CrudOptions<TCreate, TUpdate>) {
  const serialize = opts.serialize ?? ((row: Row) => row);
  const withInclude = opts.include ? { include: opts.include } : {};

  /**
   * Serve the user's list from the Next Data Cache so rapid reloads (which
   * refetch every dashboard widget at once) don't each hit the DB. Keyed by
   * userId and tagged so a write busts it immediately; `revalidate` is only a
   * fallback ceiling. `requireUserId` (which reads the session) stays OUTSIDE
   * the cached function — the callback must be free of request-scoped input.
   */
  async function list(): Promise<NextResponse> {
    const userId = await requireUserId();
    const load = unstable_cache(
      async (uid: string) => {
        const rows = await opts.delegate.findMany({
          where: { userId: uid },
          ...(opts.orderBy ? { orderBy: opts.orderBy } : {}),
          ...withInclude,
        });
        return rows.map(serialize);
      },
      ["crud-list", opts.resource],
      { tags: [listTag(opts.resource, userId)], revalidate: 60 },
    );
    return NextResponse.json(await load(userId));
  }

  /**
   * Bust this resource's cached list and the dashboard aggregate after a
   * write, so mutations are reflected immediately instead of within the TTL.
   */
  function invalidate(userId: string): void {
    revalidateTag(listTag(opts.resource, userId));
    revalidateTag(dashboardTag(userId));
  }

  async function create(req: Request): Promise<NextResponse> {
    const userId = await requireUserId();
    const input = await parseBody(req, opts.createSchema);
    const data = opts.toCreateData
      ? opts.toCreateData(input, userId)
      : { ...input, userId };
    const row = await opts.delegate.create({ data, ...withInclude });
    invalidate(userId);
    return NextResponse.json(serialize(row), { status: 201 });
  }

  async function update(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const input = await parseBody(req, opts.updateSchema);
    const data = opts.toUpdateData ? opts.toUpdateData(input) : { ...input };
    const row = await opts.delegate.update({
      where: { id, userId },
      data,
      ...withInclude,
    });
    invalidate(userId);
    return NextResponse.json(serialize(row));
  }

  async function remove(_req: Request, ctx: RouteContext): Promise<NextResponse> {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    await opts.delegate.delete({ where: { id, userId } });
    invalidate(userId);
    return NextResponse.json({ success: true });
  }

  return { list, create, update, remove };
}
