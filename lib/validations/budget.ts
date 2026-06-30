import { z } from "zod";

export const budgetSchema = z.object({
	name: z.string().min(1, "Name required").max(120),
	amount: z
		.union([z.number(), z.string()])
		.transform((v) => Number(v))
		.pipe(z.number().positive("Amount must be > 0").finite()),
	currency: z.string().length(3).optional(),
	period: z.enum(["monthly"]).optional(),
	tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
