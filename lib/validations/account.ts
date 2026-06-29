import { z } from "zod";

export const ACCOUNT_TYPES = [
	"cash",
	"checking",
	"savings",
	"investment",
	"crypto",
	"property",
	"loan",
	"credit",
	"other",
] as const;

export const accountSchema = z.object({
	name: z.string().min(1, "Name required").max(120),
	type: z.enum(ACCOUNT_TYPES).optional(),
	// Negative balances are allowed (liabilities).
	balance: z
		.union([z.number(), z.string()])
		.transform((v) => Number(v))
		.pipe(z.number().finite("Balance must be a number")),
	currency: z.string().length(3).optional(),
});

export type AccountInput = z.infer<typeof accountSchema>;
