import { route } from "@/lib/api/handler";
import { bookmarkHandlers } from "@/lib/api/resources";

export const PUT = route(bookmarkHandlers.update);
export const DELETE = route(bookmarkHandlers.remove);
