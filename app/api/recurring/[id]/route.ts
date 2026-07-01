import { route } from "@/lib/api/handler";
import { recurringHandlers } from "@/lib/api/resources";

export const PATCH = route(recurringHandlers.update);
export const DELETE = route(recurringHandlers.remove);
