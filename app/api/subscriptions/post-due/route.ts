import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { postDueRenewals } from "@/lib/api/post-renewals";
import { requireUserId } from "@/lib/api/session";

/** Post the current user's due subscription renewals into Expenses. */
export const POST = route(async () => {
	const userId = await requireUserId();
	const result = await postDueRenewals(userId);
	return NextResponse.json(result);
});
