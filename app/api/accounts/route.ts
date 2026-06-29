import { route } from "@/lib/api/handler";
import { accountHandlers } from "@/lib/api/resources";

export const GET = route(accountHandlers.list);
export const POST = route(accountHandlers.create);
