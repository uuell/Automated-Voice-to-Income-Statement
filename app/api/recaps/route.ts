
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { confirmationSchema } from "@/lib/validations/confirmation";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = confirmationSchema.safeParse(body);

        if (!validated.success) {
        return NextResponse.json(
            {
            success: false,
            message: "Please review the transaction details.",
            errors: validated.error.flatten(),
            },
            { status: 400 }
        );
        }

        const { transcript, recapDate, transactions } =
        validated.data;

        const vehicleIds = [
        ...new Set(
            transactions
            .map((transaction) => transaction.vehicleId)
            .filter((id): id is string => Boolean(id))
        ),
        ];

        // Verify that every selected vehicle exists.
        if (vehicleIds.length > 0) {
        const linkedVehicles = await prisma.vehicle.findMany({
            where: {
            id: {
                in: vehicleIds,
            },
            },
            select: {
            id: true,
            status: true,
            },
        });

        const existingIds = new Set(
            linkedVehicles.map((vehicle) => vehicle.id)
        );

        const missingIds = vehicleIds.filter(
            (id) => !existingIds.has(id)
        );

        if (missingIds.length > 0) {
            return NextResponse.json(
            {
                success: false,
                message:
                "One or more selected vehicles do not exist. Refresh inventory and try again.",
            },
            { status: 400 }
            );
        }
        }

        // Only vehicle-related transactions can reference inventory.
        for (const transaction of transactions) {
        if (!transaction.vehicleId) {
            continue;
        }

        const isVehicleTransaction =
            (transaction.type === "REVENUE" &&
            transaction.category === "Vehicle Sales") ||
            transaction.type === "INVENTORY_PURCHASE";

        if (!isVehicleTransaction) {
            return NextResponse.json(
            {
                success: false,
                message:
                "Only vehicle sales and inventory purchases can be linked to vehicles.",
            },
            { status: 400 }
            );
        }
        }

        // Only confirmed vehicle sales change inventory status.
        const confirmedVehicleSales = transactions.filter(
        (transaction) =>
            transaction.type === "REVENUE" &&
            transaction.category === "Vehicle Sales" &&
            transaction.vehicleId &&
            transaction.amount !== null &&
            transaction.reviewFlags.length === 0
        );

        const soldVehicleIds = confirmedVehicleSales.map(
        (transaction) => transaction.vehicleId as string
        );

        // Detect duplicate sales within the submitted recap.
        if (new Set(soldVehicleIds).size !== soldVehicleIds.length) {
        return NextResponse.json(
            {
            success: false,
            message:
                "The same vehicle appears in multiple confirmed sales in this recap. Review the transactions before saving.",
            },
            { status: 400 }
        );
        }

        // Atomically save the recap and mark sold vehicles.
        const result = await prisma.$transaction(async (tx) => {
            
            const confirmedPurchases = transactions.filter(
            (transaction) =>
                transaction.type === "INVENTORY_PURCHASE" &&
                transaction.vehicleId &&
                transaction.amount !== null &&
                transaction.reviewFlags.length === 0
            );

            const purchaseVehicleIds = confirmedPurchases.map(
            (transaction) => transaction.vehicleId as string
            );

            if (
            new Set(purchaseVehicleIds).size !== purchaseVehicleIds.length
            ) {
            throw new Error("DUPLICATE_INVENTORY_PURCHASE");
            }

            for (const purchase of confirmedPurchases) {
            const vehicleId = purchase.vehicleId as string;
            const purchaseCost = new Prisma.Decimal(
                purchase.amount as string
            );
            const existingPurchase = await tx.transaction.findFirst({
                where: {
                    vehicleId,
                    type: "INVENTORY_PURCHASE",
                    status: "CONFIRMED",
                    recap: {
                    status: "COMPLETED",
                    },
                },
                select: {
                    id: true,
                },
            });

            if (existingPurchase) {
            throw new Error("DUPLICATE_EXISTING_PURCHASE");
            }


            const vehicle = await tx.vehicle.findUnique({
                where: { id: vehicleId },
                select: {
                id: true,
                status: true,
                acquisitionCost: true,
                acquisitionDate: true,
                },
            });

            if (!vehicle) {
                throw new Error("PURCHASE_VEHICLE_NOT_FOUND");
            }

            const existingCost = vehicle.acquisitionCost;

            if (
                existingCost !== null &&
                !existingCost.equals(purchaseCost)
            ) {
                throw new Error("PURCHASE_COST_CONFLICT");
            }

            // Never change acquisition costs on sold vehicles.
            if (
                vehicle.status === "SOLD" &&
                existingCost === null
            ) {
                throw new Error("SOLD_VEHICLE_COST_LOCKED");
            }

            if (existingCost === null) {
                await tx.vehicle.update({
                where: { id: vehicleId },
                data: {
                    acquisitionCost: purchaseCost,
                    acquisitionDate:
                    vehicle.acquisitionDate ??
                    new Date(`${recapDate}T12:00:00.000Z`),
                },
                });
            }
            }

        for (const vehicleId of soldVehicleIds) {
            const existingSale = await tx.transaction.findFirst({
            where: {
                vehicleId,
                type: "REVENUE",
                category: "Vehicle Sales",
                status: "CONFIRMED",
                recap: {
                status: "COMPLETED",
                },
            },
            select: {
                id: true,
            },
            });

            if (existingSale) {
            throw new Error(
                `DUPLICATE_VEHICLE_SALE:${vehicleId}`
            );
            }

            // Claim the vehicle only if it has not been sold.
            const updated = await tx.vehicle.updateMany({
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

            if (updated.count !== 1) {
            throw new Error(
                `VEHICLE_NOT_AVAILABLE:${vehicleId}`
            );
            }
        }

        return tx.recap.create({
            data: {
            transcript,
            recapDate: new Date(
                `${recapDate}T12:00:00.000Z`
            ),
            status: "COMPLETED",
            transactions: {
                create: transactions.map((transaction) => ({
                description: transaction.description,
                type: transaction.type,
                category: transaction.category,
                vehicleId: transaction.vehicleId ?? null,
                amount:
                    transaction.amount === null
                    ? null
                    : new Prisma.Decimal(transaction.amount),
                    status:
                    transaction.amount === null ||
                    transaction.reviewFlags.length > 0 ||
                    (
                        transaction.type === "REVENUE" &&
                        transaction.category === "Vehicle Sales" &&
                        !transaction.vehicleId
                    )
                        ? "NEEDS_REVIEW"
                        : "CONFIRMED",
                transactionDate: new Date(
                    `${recapDate}T12:00:00.000Z`
                ),
                sourceText: transaction.sourceText,
                notes: transaction.notes,
                reviewFlags: JSON.stringify(
                    transaction.reviewFlags
                ),
                })),
            },
            },
            include: {
            transactions: true,
            },
        });
        });

        return NextResponse.json(
        {
            success: true,
            message: "Recap and transactions saved successfully.",
            recapId: result.id,
            transactionCount: result.transactions.length,
        },
        { status: 201 }
        );
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.startsWith("DUPLICATE_VEHICLE_SALE:")
            ) {
            return NextResponse.json(
                {
                success: false,
                message:
                    "This vehicle already has a confirmed sale. Duplicate sales are not allowed.",
                },
                { status: 409 }
            );
        }

        if (
            error instanceof Error &&
            error.message.startsWith("VEHICLE_NOT_AVAILABLE:")
            ) {
            return NextResponse.json(
                {
                success: false,
                message:
                    "This vehicle is already sold or is no longer available. Refresh inventory and review the selection.",
                },
                { status: 409 }
            );
        }

        
        if (error instanceof Error) {
            const purchaseErrors: Record<string, string> = {
                DUPLICATE_INVENTORY_PURCHASE:
                "The same vehicle has multiple confirmed inventory purchases in this recap.",
                PURCHASE_VEHICLE_NOT_FOUND:
                "The selected inventory vehicle no longer exists.",
                PURCHASE_COST_CONFLICT:
                "The purchase amount does not match the vehicle's recorded acquisition cost. Review the inventory record before saving.",
                SOLD_VEHICLE_COST_LOCKED:
                "A sold vehicle's acquisition cost cannot be established through a new purchase transaction.",
                DUPLICATE_EXISTING_PURCHASE:
                "This vehicle already has a confirmed inventory purchase. Duplicate purchases are not allowed.",
            };

            const message = purchaseErrors[error.message];

            if (message) {
                return NextResponse.json(
                {
                    success: false,
                    message,
                },
                { status: 409 }
                );
            }
        }


        console.error("Failed to save recap:", error);

        return NextResponse.json(
        {
            success: false,
            message: "Failed to save recap.",
        },
        { status: 500 }
        );
    }
}
