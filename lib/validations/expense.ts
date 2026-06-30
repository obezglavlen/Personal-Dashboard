import { z } from "zod";

export const expenseSchema = z.object({
	name: z.string().min(1, "Name required").max(120),
	amount: z
		.union([z.number(), z.string()])
		.transform((v) => Number(v))
		.pipe(z.number().nonnegative("Amount must be >= 0").finite()),
	currency: z.string().length(3).optional(),
	date: z.string().optional(),
	tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
