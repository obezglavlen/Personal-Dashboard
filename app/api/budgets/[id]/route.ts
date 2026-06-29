import { route } from "@/lib/api/handler";
import { budgetHandlers } from "@/lib/api/resources";

export const PATCH = route(budgetHandlers.update);
export const DELETE = route(budgetHandlers.remove);
