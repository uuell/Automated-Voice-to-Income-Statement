
import { z } from "zod";

export const transactionTypes = [
  "REVENUE",
  "COST_OF_SALES",
  "OPERATING_EXPENSE",
  "INVENTORY_PURCHASE",
  "CUSTOMER_DEPOSIT",
] as const;

export const extractedTransactionSchema = z.object({
  description: z.string().min(1),
  type: z.enum(transactionTypes),
  category: z.string().min(1),
  amount: z.string().nullable(),
  sourceText: z.string().min(1),
  notes: z.string().nullable(),
  reviewFlags: z.array(z.string()),
});

export const extractionResultSchema = z.object({
  transactions: z.array(extractedTransactionSchema),
});

export type ExtractionResult = z.infer<
  typeof extractionResultSchema
>;
