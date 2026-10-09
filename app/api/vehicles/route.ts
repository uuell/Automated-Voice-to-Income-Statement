
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const vehicleSchema = z.object({
  plateNumber: z.string().trim().optional().nullable(),
  make: z.string().trim().optional().nullable(),
  model: z.string().trim().min(1),
  variant: z.string().trim().optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  color: z.string().trim().optional().nullable(),

  acquisitionCost: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .nullable(),

  acquisitionDate: z.iso.date().optional().nullable(),
});

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        transactions: {
          where: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        year: vehicle.year,
        color: vehicle.color,
        acquisitionCost:
          vehicle.acquisitionCost?.toFixed(2) ?? null,
        acquisitionDate: vehicle.acquisitionDate,
        status:
          vehicle.transactions.length > 0
            ? "SOLD"
            : vehicle.status,
      })),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve vehicles.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = vehicleSchema.safeParse(body);

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

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: data.plateNumber || null,
        make: data.make || null,
        model: data.model,
        variant: data.variant || null,
        year: data.year ?? null,
        color: data.color || null,
        acquisitionCost:
          data.acquisitionCost == null
            ? null
            : new Prisma.Decimal(data.acquisitionCost),
        acquisitionDate: data.acquisitionDate
          ? new Date(`${data.acquisitionDate}T12:00:00.000Z`)
          : null,
        status: "IN_STOCK",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Vehicle registered successfully.",
        vehicle: {
          ...vehicle,
          acquisitionCost:
            vehicle.acquisitionCost?.toFixed(2) ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A vehicle with this plate number already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to register vehicle.",
      },
      { status: 500 }
    );
  }
}
