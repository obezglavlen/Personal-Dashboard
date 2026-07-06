import { route } from "@/lib/api/handler";
import { calendarEventHandlers } from "@/lib/api/resources";

export const GET = route(calendarEventHandlers.list);
export const POST = route(calendarEventHandlers.create);
