import { route } from "@/lib/api/handler";
import { subscriptionHandlers } from "@/lib/api/resources";

export const GET = route(subscriptionHandlers.list);
export const POST = route(subscriptionHandlers.create);
