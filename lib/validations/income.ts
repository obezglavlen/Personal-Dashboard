import { z } from "zod";

export const incomeSchema = z.object({
	taxConfigId: z.string().min(1).optional().nullable(),
	date: z.string().optional(),
	amount: z
		.union([z.number(), z.string()])
		.transform((v) => Number(v))
		.pipe(z.number().nonnegative())
		.optional()
		.nullable(),
	currency: z.string().length(3).optional(),
	description: z.string().max(500).optional().nullable(),
});
export type IncomeInput = z.infer<typeof incomeSchema>;
