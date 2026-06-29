import { prisma } from "@/lib/db";
import { bookmarkSchema } from "@/lib/validations/bookmark";
import { noteSchema } from "@/lib/validations/note";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { taskSchema } from "@/lib/validations/task";
import { taxConfigSchema, taxRecordSchema } from "@/lib/validations/tax";
import { crudHandlers } from "./crud";

/**
 * Resource definitions: a single source of truth for each model's CRUD
 * behaviour, shared by the collection (`/route.ts`) and item (`/[id]/route.ts`)
 * route files. Decimal/Date serialization and date-field transforms live here.
 */

const iso = (d: Date) => d.toISOString();
const num = (v: unknown) => Number(v);
const numOrNull = (v: unknown) => (v != null ? Number(v) : null);

export const noteHandlers = crudHandlers({
  delegate: prisma.note,
  createSchema: noteSchema,
  updateSchema: noteSchema,
  orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
});

export const bookmarkHandlers = crudHandlers({
  delegate: prisma.bookmark,
  createSchema: bookmarkSchema,
  updateSchema: bookmarkSchema,
  orderBy: { createdAt: "desc" },
});

export const taskHandlers = crudHandlers({
  delegate: prisma.task,
  createSchema: taskSchema,
  updateSchema: taskSchema.partial(),
  orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  toCreateData: ({ dueDate, ...rest }, userId) => ({
    ...rest,
    dueDate: dueDate ? new Date(dueDate) : null,
    userId,
  }),
  toUpdateData: ({ dueDate, ...rest }) => ({
    ...rest,
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
  }),
});

export const subscriptionHandlers = crudHandlers({
  delegate: prisma.subscription,
  createSchema: subscriptionSchema,
  updateSchema: subscriptionSchema.partial(),
  orderBy: [{ createdAt: "desc" }],
  serialize: (s) => ({
    id: s.id,
    name: s.name,
    price: num(s.price),
    period: s.period,
    startDate: iso(s.startDate),
    category: s.category,
    currency: s.currency,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  }),
  toCreateData: ({ startDate, ...rest }, userId) => ({
    ...rest,
    startDate: startDate ? new Date(startDate) : new Date(),
    userId,
  }),
  toUpdateData: ({ startDate, ...rest }) => ({
    ...rest,
    ...(startDate !== undefined && {
      startDate: startDate ? new Date(startDate) : new Date(),
    }),
  }),
});

export const taxConfigHandlers = crudHandlers({
  delegate: prisma.taxConfig,
  createSchema: taxConfigSchema,
  updateSchema: taxConfigSchema.partial(),
  orderBy: { name: "asc" },
  serialize: (c) => ({
    id: c.id,
    userId: c.userId,
    name: c.name,
    rate: num(c.rate),
    staticAmount: numOrNull(c.staticAmount),
    currency: c.currency,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  }),
});

export const taxRecordHandlers = crudHandlers({
  delegate: prisma.taxRecord,
  createSchema: taxRecordSchema,
  updateSchema: taxRecordSchema.partial(),
  orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  include: { taxConfig: true },
  serialize: (r) => ({
    id: r.id,
    userId: r.userId,
    type: r.type,
    taxConfigId: r.taxConfigId,
    taxConfigName: r.taxConfig?.name ?? null,
    date: iso(r.date),
    amount: numOrNull(r.amount),
    description: r.description,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  }),
  toCreateData: ({ month, year, ...rest }, userId) => ({
    ...rest,
    date: new Date(Date.UTC(year, month - 1, 1)),
    userId,
  }),
  toUpdateData: ({ month, year, ...rest }) => ({
    ...rest,
    ...(month !== undefined && year !== undefined && {
      date: new Date(Date.UTC(year, month - 1, 1)),
    }),
  }),
});
