import type { NextResponse } from "next/server";
import { toErrorResponse } from "./errors";

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response | NextResponse>;

/**
 * Wrap a route handler so any thrown value (ApiError, ZodError, Prisma error,
 * or anything unexpected) becomes a consistent JSON error response. Handlers
 * can `throw` freely instead of repeating try/catch and status plumbing.
 */
export function route<Ctx = unknown>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
