import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "./errors";

/**
 * Resolve the authenticated user's id, or throw `ApiError(401)`.
 * Every API route that touches user-scoped data goes through this.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }
  return session.user.id;
}
