import { z } from "zod";

/**
 * A Telegram chat id is an integer (negative for groups/channels) that we store
 * as a string. Shared by the settings route and its tests so the accept/reject
 * rule has a single source of truth.
 */
export const telegramChatIdSchema = z
	.string()
	.regex(/^-?\d+$/, "Telegram chat id must be numeric");
