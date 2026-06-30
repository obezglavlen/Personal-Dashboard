import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  price: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative("Price must be >= 0").finite()),
  period: z.enum(["monthly", "annual"]),
  startDate: z.string().optional(),
  category: z.string().max(60).optional().nullable(),
  currency: z.string().length(3).default("USD"),
  autoExpense: z.boolean().optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;