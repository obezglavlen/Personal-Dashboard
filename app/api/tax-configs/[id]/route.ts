import { route } from "@/lib/api/handler";
import { taxConfigHandlers } from "@/lib/api/resources";

export const PATCH = route(taxConfigHandlers.update);
export const DELETE = route(taxConfigHandlers.remove);
