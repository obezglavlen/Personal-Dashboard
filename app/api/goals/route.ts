import { route } from "@/lib/api/handler";
import { goalHandlers } from "@/lib/api/resources";

export const GET = route(goalHandlers.list);
export const POST = route(goalHandlers.create);
