import { route } from "@/lib/api/handler";
import { noteHandlers } from "@/lib/api/resources";

export const PUT = route(noteHandlers.update);
export const DELETE = route(noteHandlers.remove);
