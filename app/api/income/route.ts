import { route } from "@/lib/api/handler";
import { incomeHandlers } from "@/lib/api/resources";

export const GET = route(incomeHandlers.list);
export const POST = route(incomeHandlers.create);
