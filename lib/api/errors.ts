import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * An error with an associated HTTP status. Thrown anywhere inside a route
 * handler and translated to a JSON response by {@link toErrorResponse}.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isPrismaKnownError(e: unknown): e is { code: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  );
}

/**
 * Map any thrown value to a JSON `NextResponse`. Centralizes the status codes
 * for our error vocabulary: ApiError (explicit), ZodError (400),
 * Prisma P2002 (409 conflict) / P2025 (404 not found), everything else (500).
 */
export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }

  if (e instanceof ZodError) {
    return NextResponse.json({ error: e.flatten() }, { status: 400 });
  }

  if (isPrismaKnownError(e)) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A record with these values already exists" },
        { status: 409 },
      );
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  console.error("Unhandled API error:", e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
