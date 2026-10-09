
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        recap: {
          status: {
            in: ["COMPLETED", "NEEDS_REVIEW"],
          },
        },
        OR: [
          {
            status: "NEEDS_REVIEW",
          },
          {
            type: "REVENUE",
            category: "Vehicle Sales",
            status: "CONFIRMED",
            vehicleId: null,
          },
        ],
      },
      include: {
        recap: {
          select: {
            id: true,
            recapDate: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            year: true,
            status: true,
          },
        },
      },
      orderBy: [
        {
          transactionDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      transactions: transactions.map((transaction) => {
        let reviewFlags: string[] = [];

        if (transaction.reviewFlags) {
          try {
            const parsed: unknown = JSON.parse(
              transaction.reviewFlags
            );

            if (
              Array.isArray(parsed) &&
              parsed.every(
                (flag) => typeof flag === "string"
              )
            ) {
              reviewFlags = parsed;
            }
          } catch {
            reviewFlags = [
              "Stored review flags could not be read.",
            ];
          }
        }

        const missingVehicleLink =
          transaction.type === "REVENUE" &&
          transaction.category === "Vehicle Sales" &&
          !transaction.vehicleId;

        if (missingVehicleLink) {
          reviewFlags.push(
            "Vehicle sale is not linked to inventory."
          );
        }

        return {
          id: transaction.id,
          recapId: transaction.recapId,
          recapDate: transaction.recap.recapDate,
          transactionDate: transaction.transactionDate,
          description: transaction.description,
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount?.toFixed(2) ?? null,
          status: transaction.status,
          notes: transaction.notes,
          sourceText: transaction.sourceText,
          reviewFlags: [...new Set(reviewFlags)],
          vehicleId: transaction.vehicleId,
          vehicle: transaction.vehicle,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load transactions:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load transactions.",
      },
      { status: 500 }
    );
  }
}
