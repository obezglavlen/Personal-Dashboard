import { route } from "@/lib/api/handler";
import { taskHandlers } from "@/lib/api/resources";

export const PATCH = route(taskHandlers.update);
export const DELETE = route(taskHandlers.remove);
