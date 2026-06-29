import { route } from "@/lib/api/handler";
import { budgetHandlers } from "@/lib/api/resources";

export const GET = route(budgetHandlers.list);
export const POST = route(budgetHandlers.create);
