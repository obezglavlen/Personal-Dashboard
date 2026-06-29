import { route } from "@/lib/api/handler";
import { taxConfigHandlers } from "@/lib/api/resources";

export const GET = route(taxConfigHandlers.list);
export const POST = route(taxConfigHandlers.create);
