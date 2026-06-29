import { route } from "@/lib/api/handler";
import { subscriptionHandlers } from "@/lib/api/resources";

export const PATCH = route(subscriptionHandlers.update);
export const DELETE = route(subscriptionHandlers.remove);
