import { z } from "zod";

export const taxConfigSchema = z.object({
  name: z.string().min(1).max(60),
  rate: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().min(0).max(100))
    .default(0),
});
export type TaxConfigInput = z.infer<typeof taxConfigSchema>;

export const taxRecordType = z.enum([
  "income",
  "expense",
  "declaration_sent",
  "declaration_todo",
]);

export const taxRecordSchema = z.object({
  type: taxRecordType,
  taxConfigId: z.string().min(1).optional().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(3000),
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().nonnegative())
    .optional()
    .nullable(),
  description: z.string().max(500).optional().nullable(),
});
export type TaxRecordInput = z.infer<typeof taxRecordSchema>;