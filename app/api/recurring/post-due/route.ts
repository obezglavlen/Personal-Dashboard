import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { postDueRecurring } from "@/lib/api/post-recurring";
import { requireUserId } from "@/lib/api/session";

/** Post the current user's due recurring transactions (expenses + income). */
export const POST = route(async () => {
	const userId = await requireUserId();
	const result = await postDueRecurring(userId);
	return NextResponse.json(result);
});
