import { route } from "@/lib/api/handler";
import { goalHandlers } from "@/lib/api/resources";

export const PATCH = route(goalHandlers.update);
export const DELETE = route(goalHandlers.remove);
