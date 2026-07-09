import { route } from "@/lib/api/handler";
import { incomeHandlers } from "@/lib/api/resources";

export const PATCH = route(incomeHandlers.update);
export const DELETE = route(incomeHandlers.remove);
