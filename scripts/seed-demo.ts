
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_RECAP_ID = "dryve-demo-october-2026";
const DEMO_DATE = new Date("2026-10-09T10:00:00+08:00");

async function main() {
  console.log("Preparing DryvePH demo data...");

  await prisma.$transaction(async (tx) => {
    // Preserve the existing Toyota Vios when its plate matches.
    await tx.vehicle.upsert({
      where: { plateNumber: "TEST-2026" },
      update: {},
      create: {
        plateNumber: "TEST-2026",
        make: "Toyota",
        model: "Vios",
        year: 2020,
        acquisitionCost: 350000,
        status: "IN_STOCK",
      },
    });

    const honda = await tx.vehicle.upsert({
      where: { plateNumber: "DEMO-HONDA-2019" },
      update: {},
      create: {
        plateNumber: "DEMO-HONDA-2019",
        make: "Honda",
        model: "City",
        year: 2019,
        acquisitionCost: 310000,
        status: "SOLD",
      },
    });

    await tx.vehicle.upsert({
      where: { plateNumber: "DEMO-MIRAGE-2021" },
      update: {},
      create: {
        plateNumber: "DEMO-MIRAGE-2021",
        make: "Mitsubishi",
        model: "Mirage",
        year: 2021,
        acquisitionCost: 280000,
        status: "IN_STOCK",
      },
    });

    // A fixed ID prevents duplicate demo recaps.
    const existingRecap = await tx.recap.findUnique({
      where: { id: DEMO_RECAP_ID },
    });

    if (existingRecap) {
      console.log("Demo recap already exists. Skipping transactions.");
      return;
    }

    await tx.recap.create({
      data: {
        id: DEMO_RECAP_ID,
        recapDate: DEMO_DATE,
        status: "COMPLETED",
        transcript:
          "Demo recap: We sold the 2019 Honda City for 425,000 pesos. " +
          "The vehicle's acquisition cost was 310,000 pesos. " +
          "We also paid 12,000 pesos for dealership operating expenses.",
        transactions: {
          create: [
            {
              description: "Sale of 2019 Honda City",
              type: "REVENUE",
              category: "Vehicle Sales",
              amount: 425000,
              status: "CONFIRMED",
              transactionDate: DEMO_DATE,
              vehicleId: honda.id,
              sourceText: "Sold the 2019 Honda City for 425,000 pesos.",
            },
            {
              description: "Cost of 2019 Honda City sold",
              type: "COST_OF_SALES",
              category: "Vehicle Acquisition Cost",
              amount: 310000,
              status: "CONFIRMED",
              transactionDate: DEMO_DATE,
              vehicleId: honda.id,
              sourceText: "The vehicle's acquisition cost was 310,000 pesos.",
            },
            {
              description: "Dealership operating expenses",
              type: "OPERATING_EXPENSE",
              category: "Office and Admin",
              amount: 12000,
              status: "CONFIRMED",
              transactionDate: DEMO_DATE,
              sourceText:
                "Paid 12,000 pesos for dealership operating expenses.",
            },
          ],
        },
      },
    });

    console.log("Created 1 recap with 3 confirmed transactions.");
  });

  console.log("Demo seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
