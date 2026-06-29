import { route } from "@/lib/api/handler";
import { taskHandlers } from "@/lib/api/resources";

export const GET = route(taskHandlers.list);
export const POST = route(taskHandlers.create);
