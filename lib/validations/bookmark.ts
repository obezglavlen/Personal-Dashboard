import { z } from "zod";

export const bookmarkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  category: z.string().default("general"),
});

export type BookmarkInput = z.infer<typeof bookmarkSchema>;
