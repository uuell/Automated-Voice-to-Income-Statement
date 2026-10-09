import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";



const updateVehicleSchema = z
  .object({
    plateNumber: z.string().trim().min(1).nullable(),
    make: z.string().trim().min(1).nullable(),
    model: z.string().trim().min(1),
    variant: z.string().trim().min(1).nullable(),
    year: z.number().int().min(1900).max(2100).nullable(),
    color: z.string().trim().min(1).nullable(),
    acquisitionCost: z
      .union([
        z.string().regex(/^\d+(\.\d{1,2})?$/),
        z.null(),
      ]),
    acquisitionDate: z.union([z.iso.date(), z.null()]),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const body: unknown = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid vehicle information.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id },
        select: {
          id: true,
          acquisitionCost: true,
          acquisitionDate: true,
        },
      });

      if (!vehicle) {
        return { status: "NOT_FOUND" as const };
      }

      const confirmedSale = await tx.transaction.findFirst({
        where: {
          vehicleId: id,
          type: "REVENUE",
          category: "Vehicle Sales",
          status: "CONFIRMED",
          recap: { status: "COMPLETED" },
        },
        select: { id: true },
      });

      const oldCost =
        vehicle.acquisitionCost?.toFixed(2) ?? null;

      const newCost =
        data.acquisitionCost === null
          ? null
          : new Prisma.Decimal(data.acquisitionCost).toFixed(2);

      const oldDate = vehicle.acquisitionDate
        ? vehicle.acquisitionDate.toISOString().slice(0, 10)
        : null;

      const newDate = data.acquisitionDate;

      if (
        confirmedSale &&
        (oldCost !== newCost || oldDate !== newDate)
      ) {
        return { status: "LOCKED" as const };
      }

      const updated = await tx.vehicle.update({
        where: { id },
        data: {
          plateNumber: data.plateNumber,
          make: data.make,
          model: data.model,
          variant: data.variant,
          year: data.year,
          color: data.color,
          acquisitionCost:
            data.acquisitionCost === null
              ? null
              : new Prisma.Decimal(data.acquisitionCost),
          acquisitionDate: data.acquisitionDate
            ? new Date(`${data.acquisitionDate}T12:00:00.000Z`)
            : null,
        },
      });

      return {
        status: "UPDATED" as const,
        vehicle: {
          id: updated.id,
          plateNumber: updated.plateNumber,
          make: updated.make,
          model: updated.model,
          variant: updated.variant,
          year: updated.year,
          color: updated.color,
          acquisitionCost:
            updated.acquisitionCost?.toFixed(2) ?? null,
          acquisitionDate: updated.acquisitionDate,
          status: updated.status,
        },
      };
    });

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    if (result.status === "LOCKED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Acquisition cost and acquisition date cannot be changed after a confirmed vehicle sale.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle updated successfully.",
      vehicle: result.vehicle,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This plate number is already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Failed to update vehicle:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update vehicle.",
      },
      { status: 500 }
    );
  }
}


export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!vehicle) {
        return "NOT_FOUND";
      }

      const linkedTransactions = await tx.transaction.count({
        where: { vehicleId: id },
      });

      if (linkedTransactions > 0) {
        return "HAS_TRANSACTIONS";
      }

      await tx.vehicle.delete({
        where: { id },
      });

      return "DELETED";
    });

    if (result === "NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    if (result === "HAS_TRANSACTIONS") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This vehicle has linked transactions and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This vehicle is referenced by another record and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    console.error("Failed to delete vehicle:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete vehicle.",
      },
      { status: 500 }
    );
  }
}
