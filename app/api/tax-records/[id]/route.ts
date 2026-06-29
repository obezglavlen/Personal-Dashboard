import { route } from "@/lib/api/handler";
import { taxRecordHandlers } from "@/lib/api/resources";

export const PATCH = route(taxRecordHandlers.update);
export const DELETE = route(taxRecordHandlers.remove);
