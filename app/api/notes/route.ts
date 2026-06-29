import { route } from "@/lib/api/handler";
import { noteHandlers } from "@/lib/api/resources";

export const GET = route(noteHandlers.list);
export const POST = route(noteHandlers.create);
