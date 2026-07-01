import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { requireUserId } from "@/lib/api/session";
import { listTags } from "@/lib/api/tags";

/** The signed-in user's tag catalog (sorted names) — autocomplete for all modals. */
export const GET = route(async () => {
	const userId = await requireUserId();
	return NextResponse.json(await listTags(userId));
});
