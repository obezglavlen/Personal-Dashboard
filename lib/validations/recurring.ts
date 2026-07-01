import { z } from "zod";

export const recurringSchema = z.object({
	name: z.string().min(1, "Name required").max(120),
	amount: z
		.union([z.number(), z.string()])
		.transform((v) => Number(v))
		.pipe(z.number().nonnegative("Amount must be >= 0").finite()),
	type: z.enum(["income", "expense"]),
	period: z.enum(["monthly", "annual"]),
	startDate: z.string().optional(),
	endDate: z.string().optional().nullable(),
	currency: z.string().length(3).optional(),
	tags: z.array(z.string().min(1).max(40)).max(20).optional(),
	autoPost: z.boolean().optional(),
});

export type RecurringInput = z.infer<typeof recurringSchema>;
