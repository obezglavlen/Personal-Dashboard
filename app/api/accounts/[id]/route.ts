import { route } from "@/lib/api/handler";
import { accountHandlers } from "@/lib/api/resources";

export const PATCH = route(accountHandlers.update);
export const DELETE = route(accountHandlers.remove);
