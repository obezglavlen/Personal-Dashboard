import { route } from "@/lib/api/handler";
import { bookmarkHandlers } from "@/lib/api/resources";

export const GET = route(bookmarkHandlers.list);
export const POST = route(bookmarkHandlers.create);
