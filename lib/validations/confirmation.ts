
import { z } from "zod";

import { transactionTypes } from "@/lib/validations/extraction";

export const ACCOUNTING_CATEGORIES = {
  REVENUE: [
    "Vehicle Sales",
    "Other Income",
  ],
  COST_OF_SALES: [
    "Vehicle Acquisition Cost",
    "Reconditioning",
  ],
  OPERATING_EXPENSE: [
    "Salaries and Commissions",
    "Transport and Fuel",
    "Rent and Utilities",
    "Marketing",
    "Office and Admin",
    "Miscellaneous",
  ],
  INVENTORY_PURCHASE: [
    "Vehicle Inventory",
  ],
  CUSTOMER_DEPOSIT: [
    "Customer Deposits",
  ],
} as const;

const transactionSchema = z
  .object({
    description: z.string().trim().min(1),

    type: z.enum(transactionTypes),

    category: z.string().trim().min(1),

    vehicleId: z.string().min(1).nullable().optional(),

    // Missing amounts are allowed for pending transactions.
    amount: z
      .union([
        z.string().trim().regex(
          /^\d+(\.\d{1,2})?$/,
          "Enter a valid PHP amount"
        ),
        z.null(),
      ]),

    sourceText: z.string(),

    notes: z.string().nullable(),

    reviewFlags: z.array(z.string()),
  })
  .superRefine((transaction, context) => {
    const allowedCategories: readonly string[] =
      ACCOUNTING_CATEGORIES[transaction.type];

    if (!allowedCategories.includes(transaction.category)) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: `Invalid category for ${transaction.type}`,
      });
    }
  });

export const confirmationSchema = z.object({
  transcript: z.string().trim().min(5),

  recapDate: z.iso.date(),

  transactions: z.array(transactionSchema).min(1),
});
