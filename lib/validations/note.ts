import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().min(1, "Title required"),
  content: z.string().default(""),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
});

export type NoteInput = z.infer<typeof noteSchema>;
