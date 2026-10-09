
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const updateTransactionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("LINK_VEHICLE"),
    vehicleId: z.string().min(1),
  }),
  z.object({
    action: z.literal("CONFIRM"),
  }),
  z.object({
    action: z.literal("RESOLVE_FLAGS"),
  }),
  z.object({
    action: z.literal("UPDATE_AMOUNT"),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  }),
    z.object({
    action: z.literal("UPDATE_DETAILS"),
    description: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1),
    notes: z.string().trim().max(2000).nullable(),
    }),
]);


type UpdateResult =
  | "UPDATED"
  | "CONFIRMED"
  | "FLAGS_RESOLVED"
  | "AMOUNT_UPDATED"
  | "GENERAL_CONFIRMED"
  | "DETAILS_UPDATED"
  | "NOT_FOUND"
  | "NOT_VEHICLE_SALE"
  | "RECAP_NOT_COMPLETED"
  | "ALREADY_LINKED"
  | "INVALID_STATUS"
  | "INVALID_CATEGORY"
  | "VEHICLE_NOT_FOUND"
  | "VEHICLE_NOT_LINKED"
  | "VEHICLE_ALREADY_SOLD"
  | "DUPLICATE_SALE"
  | "MISSING_AMOUNT"
  | "UNRESOLVED_FLAGS"
  | "MISSING_ACQUISITION_COST";


function getReviewFlags(value: string | null): string[] | null {
    
  if (value === null || value.trim() === "") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      Array.isArray(parsed) &&
      parsed.every((flag) => typeof flag === "string")
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}


const ALLOWED_CATEGORIES: Record<string, readonly string[]> = {
  REVENUE: ["Vehicle Sales", "Other Income"],
  COST_OF_SALES: ["Vehicle Acquisition Cost", "Reconditioning"],
  OPERATING_EXPENSE: [
    "Salaries and Commissions",
    "Transport and Fuel",
    "Rent and Utilities",
    "Marketing",
    "Office and Admin",
    "Miscellaneous",
  ],
  INVENTORY_PURCHASE: ["Vehicle Inventory"],
  CUSTOMER_DEPOSIT: ["Customer Deposits"],
};


export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();

    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid transaction update request.",
        },
        { status: 400 }
      );
    }

    const result: UpdateResult = await prisma.$transaction(
      async (tx): Promise<UpdateResult> => {
        const transaction = await tx.transaction.findUnique({
          where: { id },
          include: {
            recap: {
              select: { status: true },
            },
          },
        });

        if (!transaction) {
          return "NOT_FOUND";
        }


        
        if (parsed.data.action === "UPDATE_DETAILS") {
            if (transaction.recap.status !== "COMPLETED") {
                return "RECAP_NOT_COMPLETED";
            }

            if (transaction.status !== "NEEDS_REVIEW") {
                return "INVALID_STATUS";
            }

            const { description, category, notes } = parsed.data;

            const allowedCategories = ALLOWED_CATEGORIES[transaction.type];

            if (!allowedCategories?.includes(category)) {
                return "INVALID_CATEGORY";
            }

            if (transaction.vehicleId !== null && category !== transaction.category) {
                return "INVALID_STATUS";
            }

            const changes = [
                {
                fieldName: "description",
                oldValue: transaction.description,
                newValue: description,
                },
                {
                fieldName: "category",
                oldValue: transaction.category,
                newValue: category,
                },
                {
                fieldName: "notes",
                oldValue: transaction.notes,
                newValue: notes,
                },
            ].filter((change) => change.oldValue !== change.newValue);

            if (changes.length === 0) {
                return "DETAILS_UPDATED";
            }

            await tx.transaction.update({
                where: { id },
                data: {
                description,
                category,
                notes,
                },
            });

            await tx.transactionReview.createMany({
                data: changes.map((change) => ({
                transactionId: id,
                fieldName: change.fieldName,
                oldValue: change.oldValue,
                newValue: change.newValue,
                reason: "Manager corrected transaction details.",
                })),
            });

            return "DETAILS_UPDATED";
        }

        
        if (parsed.data.action === "UPDATE_AMOUNT") {
            if (transaction.recap.status !== "COMPLETED") {
                return "RECAP_NOT_COMPLETED";
            }

            if (transaction.status !== "NEEDS_REVIEW") {
                return "INVALID_STATUS";
            }

            const newAmount = new Prisma.Decimal(parsed.data.amount);

            if (newAmount.lte(0)) {
                return "MISSING_AMOUNT";
            }

            const oldAmount = transaction.amount?.toFixed(2) ?? null;

            if (oldAmount === newAmount.toFixed(2)) {
                return "AMOUNT_UPDATED";
            }

            await tx.transaction.update({
                where: { id },
                data: {
                amount: newAmount,
                },
            });

            await tx.transactionReview.create({
                data: {
                transactionId: id,
                fieldName: "amount",
                oldValue: oldAmount,
                newValue: newAmount.toFixed(2),
                reason: "Manager corrected transaction amount.",
                },
            });

            return "AMOUNT_UPDATED";
        }

        if (parsed.data.action === "RESOLVE_FLAGS") {
            if (transaction.recap.status !== "COMPLETED") {
            return "RECAP_NOT_COMPLETED";
            }
            if (transaction.status !== "NEEDS_REVIEW") {
                return "INVALID_STATUS";
            }

            const flags = getReviewFlags(transaction.reviewFlags);

            if (flags === null) {
                return "UNRESOLVED_FLAGS";
            }

            if (flags.length === 0) {
                return "FLAGS_RESOLVED";
            }

            await tx.transaction.update({
                where: { id },
                data: {
                reviewFlags: JSON.stringify([]),
                },
            });

            await tx.transactionReview.create({
                data: {
                transactionId: id,
                fieldName: "reviewFlags",
                oldValue: transaction.reviewFlags,
                newValue: JSON.stringify([]),
                reason: "Manager verified and resolved review flags.",
                },
            });

            return "FLAGS_RESOLVED";
        }

        
        if (
        parsed.data.action === "CONFIRM" &&
        !(
            transaction.type === "REVENUE" &&
            transaction.category === "Vehicle Sales"
        )
        ) {
        if (transaction.recap.status !== "COMPLETED") {
            return "RECAP_NOT_COMPLETED";
        }

        if (transaction.status !== "NEEDS_REVIEW") {
            return "INVALID_STATUS";
        }

        if (
            transaction.amount === null ||
            transaction.amount.lte(0)
        ) {
            return "MISSING_AMOUNT";
        }

        const flags = getReviewFlags(transaction.reviewFlags);

        if (flags === null || flags.length > 0) {
            return "UNRESOLVED_FLAGS";
        }

        // Inventory purchases require their own synchronization workflow.
        // Vehicle acquisition COGS must not bypass inventory accounting.
        if (
            transaction.type === "INVENTORY_PURCHASE" ||
            (transaction.type === "COST_OF_SALES" &&
            transaction.category === "Vehicle Acquisition Cost") ||
            transaction.vehicleId !== null
        ) {
            return "INVALID_STATUS";
        }

        const confirmed = await tx.transaction.updateMany({
            where: {
            id,
            status: "NEEDS_REVIEW",
            },
            data: {
            status: "CONFIRMED",
            },
        });

        if (confirmed.count !== 1) {
            throw new Error(
            "Transaction status changed during confirmation."
            );
        }

        await tx.transactionReview.create({
            data: {
            transactionId: id,
            fieldName: "status",
            oldValue: "NEEDS_REVIEW",
            newValue: "CONFIRMED",
            reason: "Manager confirmed verified non-vehicle transaction.",
            },
        });

        return "GENERAL_CONFIRMED";
        }


        if (
          transaction.type !== "REVENUE" ||
          transaction.category !== "Vehicle Sales"
        ) {
          return "NOT_VEHICLE_SALE";
        }

        if (transaction.recap.status !== "COMPLETED") {
          return "RECAP_NOT_COMPLETED";
        }

        if (parsed.data.action === "LINK_VEHICLE") {
          const { vehicleId } = parsed.data;

          if (transaction.vehicleId) {
            return "ALREADY_LINKED";
          }

          if (
            transaction.status !== "CONFIRMED" &&
            transaction.status !== "NEEDS_REVIEW"
          ) {
            return "INVALID_STATUS";
          }

          const vehicle = await tx.vehicle.findUnique({
            where: { id: vehicleId },
            select: {
              id: true,
              status: true,
            },
          });

          if (!vehicle) {
            return "VEHICLE_NOT_FOUND";
          }

          const existingSale = await tx.transaction.findFirst({
            where: {
              vehicleId,
              id: { not: id },
              type: "REVENUE",
              category: "Vehicle Sales",
              status: "CONFIRMED",
              recap: {
                status: "COMPLETED",
              },
            },
            select: { id: true },
          });

          if (existingSale) {
            return "DUPLICATE_SALE";
          }

          if (vehicle.status === "SOLD") {
            return "VEHICLE_ALREADY_SOLD";
          }

          // Historical confirmed sales immediately claim inventory.
          // Pending sales only store the vehicle link.
          if (transaction.status === "CONFIRMED") {
            const claimed = await tx.vehicle.updateMany({
              where: {
                id: vehicleId,
                status: {
                  in: ["IN_STOCK", "RESERVED"],
                },
              },
              data: {
                status: "SOLD",
              },
            });

            if (claimed.count !== 1) {
              return "VEHICLE_ALREADY_SOLD";
            }
          }

          await tx.transaction.update({
            where: { id },
            data: { vehicleId },
          });

          await tx.transactionReview.create({
            data: {
              transactionId: id,
              fieldName: "vehicleId",
              oldValue: null,
              newValue: vehicleId,
              reason: "Manager linked sale to inventory.",
            },
          });

          return "UPDATED";
        }

    
        // CONFIRM action
        if (transaction.status !== "NEEDS_REVIEW") {
          return "INVALID_STATUS";
        }

        if (
          transaction.amount === null ||
          transaction.amount.lte(0)
        ) {
          return "MISSING_AMOUNT";
        }

        if (!transaction.vehicleId) {
          return "VEHICLE_NOT_LINKED";
        }

        const reviewFlags = getReviewFlags(
          transaction.reviewFlags
        );

        if (
          reviewFlags === null ||
          reviewFlags.length > 0
        ) {
          return "UNRESOLVED_FLAGS";
        }

        const vehicle = await tx.vehicle.findUnique({
          where: { id: transaction.vehicleId },
          select: {
            id: true,
            status: true,
            acquisitionCost: true,
          },
        });

        if (!vehicle) {
          return "VEHICLE_NOT_FOUND";
        }

        if (vehicle.acquisitionCost === null) {
          return "MISSING_ACQUISITION_COST";
        }

        const existingSale = await tx.transaction.findFirst({
          where: {
            vehicleId: transaction.vehicleId,
            id: { not: id },
            type: "REVENUE",
            category: "Vehicle Sales",
            status: "CONFIRMED",
            recap: {
              status: "COMPLETED",
            },
          },
          select: { id: true },
        });

        if (existingSale) {
          return "DUPLICATE_SALE";
        }

        const claimed = await tx.vehicle.updateMany({
          where: {
            id: transaction.vehicleId,
            status: {
              in: ["IN_STOCK", "RESERVED"],
            },
          },
          data: {
            status: "SOLD",
          },
        });

        if (claimed.count !== 1) {
          return "VEHICLE_ALREADY_SOLD";
        }

        const confirmed = await tx.transaction.updateMany({
          where: {
            id,
            status: "NEEDS_REVIEW",
          },
          data: {
            status: "CONFIRMED",
          },
        });

        if (confirmed.count !== 1) {
          throw new Error(
            "Transaction status changed during confirmation."
          );
        }

        await tx.transactionReview.create({
          data: {
            transactionId: id,
            fieldName: "status",
            oldValue: "NEEDS_REVIEW",
            newValue: "CONFIRMED",
            reason: "Manager confirmed vehicle sale.",
          },
        });

        return "CONFIRMED";
      }
    );

    const errors: Record<
      Exclude<UpdateResult, "UPDATED" | "CONFIRMED" | "FLAGS_RESOLVED" | "AMOUNT_UPDATED" | "GENERAL_CONFIRMED" | "DETAILS_UPDATED">,
      { message: string; status: number }
    > = {
      NOT_FOUND: {
        message: "Transaction not found.",
        status: 404,
      },
      NOT_VEHICLE_SALE: {
        message:
          "This endpoint currently supports vehicle sales only.",
        status: 400,
      },
      RECAP_NOT_COMPLETED: {
        message: "The recap must be completed first.",
        status: 409,
      },
      ALREADY_LINKED: {
        message: "This sale already has a linked vehicle.",
        status: 409,
      },
      INVALID_STATUS: {
        message:
          "This transaction is not eligible for the requested action.",
        status: 409,
      },
      VEHICLE_NOT_FOUND: {
        message: "Selected vehicle does not exist.",
        status: 404,
      },
      VEHICLE_NOT_LINKED: {
        message:
          "Link the sale to a registered vehicle before confirming.",
        status: 409,
      },
      VEHICLE_ALREADY_SOLD: {
        message:
          "This vehicle is already sold and cannot be sold again.",
        status: 409,
      },
      DUPLICATE_SALE: {
        message:
          "This vehicle already has another confirmed sale.",
        status: 409,
      },
      MISSING_AMOUNT: {
        message:
          "A positive sale amount is required before confirmation.",
        status: 409,
      },
      UNRESOLVED_FLAGS: {
        message:
          "Resolve the transaction's review flags before confirming.",
        status: 409,
      },
      MISSING_ACQUISITION_COST: {
        message:
          "Add the vehicle's acquisition cost before confirming the sale.",
        status: 409,
      },
      INVALID_CATEGORY: {
        message: "Category is not valid for this transaction type.",
        status: 400,
        },
    };
    
    if (
    result !== "UPDATED" &&
    result !== "CONFIRMED" &&
    result !== "FLAGS_RESOLVED" &&
    result !== "AMOUNT_UPDATED"  &&
    result !== "GENERAL_CONFIRMED" && 
    result !== "DETAILS_UPDATED"
    ) {
      const error = errors[result];

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }

   
    return NextResponse.json({
    success: true,
    message:
        result === "GENERAL_CONFIRMED"
        ? "Transaction confirmed successfully."
        : result === "CONFIRMED"
            ? "Vehicle sale confirmed successfully."
            : result === "FLAGS_RESOLVED"
            ? "Review flags resolved successfully."
            : result === "AMOUNT_UPDATED"
                ? "Transaction amount updated successfully."
                : result === "DETAILS_UPDATED"
                ? "Transaction details updated successfully."
                : "Vehicle linked successfully.",
    });
  } catch (error) {
    console.error("Failed to update transaction:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update transaction.",
      },
      { status: 500 }
    );
  }
}
