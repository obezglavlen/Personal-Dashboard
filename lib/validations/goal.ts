import { z } from "zod";

const money = z
	.union([z.number(), z.string()])
	.transform((v) => Number(v))
	.pipe(z.number().finite());

export const goalSchema = z.object({
	name: z.string().min(1, "Name required").max(120),
	target: money.pipe(z.number().positive("Target must be > 0")),
	current: money.pipe(z.number().nonnegative("Current must be >= 0")).optional(),
	currency: z.string().length(3).optional(),
});

export type GoalInput = z.infer<typeof goalSchema>;
