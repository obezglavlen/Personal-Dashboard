import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/json";
import { requireUserId } from "@/lib/api/session";
import { syncTags } from "@/lib/api/tags";
import { deleteEvent, editEvent } from "@/lib/calendar/service";
import {
	calendarEditSchema,
	EDIT_SCOPES,
	type EditScope,
} from "@/lib/validations/calendar";

interface Ctx {
	params: Promise<{ id: string }>;
}

/** PATCH edits an event; `scope` (this|following|all) is carried in the body. */
async function patch(req: Request, ctx: Ctx): Promise<NextResponse> {
	const userId = await requireUserId();
	const { id } = await ctx.params;
	const input = await parseBody(req, calendarEditSchema);
	const result = await editEvent(userId, id, input);
	if (input.tags) await syncTags(userId, input.tags);
	return NextResponse.json(result);
}

/** DELETE reads `scope` + `occurrenceStart` from the query (no body). */
async function remove(req: Request, ctx: Ctx): Promise<NextResponse> {
	const userId = await requireUserId();
	const { id } = await ctx.params;
	const url = new URL(req.url);
	const raw = url.searchParams.get("scope");
	const scope: EditScope = EDIT_SCOPES.includes(raw as EditScope)
		? (raw as EditScope)
		: "all";
	const occurrenceStart = url.searchParams.get("occurrenceStart") ?? undefined;
	await deleteEvent(userId, id, scope, occurrenceStart);
	return NextResponse.json({ success: true });
}

export const PATCH = route(patch);
export const DELETE = route(remove);
