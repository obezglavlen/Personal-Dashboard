import { route } from "@/lib/api/handler";
import { taxRecordHandlers } from "@/lib/api/resources";

export const GET = route(taxRecordHandlers.list);
export const POST = route(taxRecordHandlers.create);
