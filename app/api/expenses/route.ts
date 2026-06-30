import { route } from "@/lib/api/handler";
import { expenseHandlers } from "@/lib/api/resources";

export const GET = route(expenseHandlers.list);
export const POST = route(expenseHandlers.create);
