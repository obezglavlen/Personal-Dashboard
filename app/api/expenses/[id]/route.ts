import { route } from "@/lib/api/handler";
import { expenseHandlers } from "@/lib/api/resources";

export const PATCH = route(expenseHandlers.update);
export const DELETE = route(expenseHandlers.remove);
