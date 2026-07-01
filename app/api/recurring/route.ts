import { route } from "@/lib/api/handler";
import { recurringHandlers } from "@/lib/api/resources";

export const GET = route(recurringHandlers.list);
export const POST = route(recurringHandlers.create);
