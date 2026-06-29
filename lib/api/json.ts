import type { ZodType } from "zod";
import { ApiError } from "./errors";

/** Read a request's JSON body, turning malformed JSON into a 400 (not a 500). */
async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

/**
 * Read and validate a request body against a Zod schema. A validation failure
 * throws a `ZodError`, which {@link toErrorResponse} turns into a 400 with the
 * flattened field errors.
 */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const body = await readJson(req);
  return schema.parse(body);
}
