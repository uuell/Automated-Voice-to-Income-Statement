
import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const REVENUE_CATEGORIES = [
  "Vehicle Sales",
  "Other Income",
];

const COST_CATEGORIES = [
  "Vehicle Acquisition Cost",
  "Reconditioning",
];

const EXPENSE_CATEGORIES = [
  "Salaries and Commissions",
  "Transport and Fuel",
  "Rent and Utilities",
  "Marketing",
  "Office and Admin",
  "Miscellaneous",
];

export function isValidReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function generateIncomeStatement(
  startDate: string,
  endDate: string
) {
  if (
    !isValidReportDate(startDate) ||
    !isValidReportDate(endDate) ||
    startDate > endDate
  ) {
    throw new Error("Invalid date range.");
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  end.setUTCDate(end.getUTCDate() + 1);

  // Confirmed transactions included in financial totals.
  // Include linked vehicle data for acquisition-cost matching.
  const transactions = await prisma.transaction.findMany({
    where: {
      status: "CONFIRMED",
      recap: {
        status: "COMPLETED",
      },
      transactionDate: {
        gte: start,
        lt: end,
      },
    },
    include: {
      vehicle: true,
    },
    orderBy: {
      transactionDate: "asc",
    },
  });

  // Pending transactions are excluded from financial totals.
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: "NEEDS_REVIEW",
      recap: {
        status: {
          in: ["COMPLETED", "NEEDS_REVIEW"],
        },
      },
      transactionDate: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      transactionDate: "asc",
    },
  });

  const zero = () => new Prisma.Decimal(0);
  const warnings: string[] = [];

  // Identify confirmed vehicle sales.
  const vehicleSales = transactions.filter(
    (transaction) =>
      transaction.type === "REVENUE" &&
      transaction.category === "Vehicle Sales"
  );

  // Identify explicitly recorded acquisition costs.
  const acquisitionCosts = transactions.filter(
    (transaction) =>
      transaction.type === "COST_OF_SALES" &&
      transaction.category === "Vehicle Acquisition Cost"
  );

  // Track vehicles whose inventory acquisition costs
  // have already been recognized in this report.
  const recognizedVehicleIds = new Set<string>();

  let inventoryAcquisitionCost = zero();
  let inventoryAcquisitionCount = 0;

  for (const sale of vehicleSales) {
    if (!sale.vehicleId || !sale.vehicle) {
      warnings.push(
        `Vehicle sale "${sale.description}" is not linked to a registered vehicle. Verify its acquisition cost.`
      );
      continue;
    }

    const vehicle = sale.vehicle;

    // Detect duplicate sales linked to the same vehicle.
    if (recognizedVehicleIds.has(vehicle.id)) {
      warnings.push(
        `Vehicle "${vehicle.model}" (${vehicle.plateNumber ?? "no plate"}) appears in multiple confirmed sales in this report period. Check for duplicate revenue.`
      );
      continue;
    }

    recognizedVehicleIds.add(vehicle.id);

    // If an explicit acquisition-cost transaction exists
    // for this vehicle, don't add its inventory cost again.
    const hasExplicitAcquisitionCost = acquisitionCosts.some(
      (cost) => cost.vehicleId === vehicle.id
    );

    if (hasExplicitAcquisitionCost) {
      continue;
    }

    if (vehicle.acquisitionCost === null) {
      warnings.push(
        `Vehicle "${vehicle.model}" (${vehicle.plateNumber ?? "no plate"}) has no recorded acquisition cost. Verify COGS.`
      );
      continue;
    }

    inventoryAcquisitionCost =
      inventoryAcquisitionCost.plus(vehicle.acquisitionCost);

    inventoryAcquisitionCount += 1;
  }

  // Calculate ordinary category totals from confirmed transactions.
  function categoryTotals(
    type: string,
    categories: string[]
  ) {
    return categories.map((category) => {
      const matching = transactions.filter(
        (transaction) =>
          transaction.type === type &&
          transaction.category === category
      );

      let amount = matching.reduce(
        (total, transaction) =>
          total.plus(transaction.amount ?? zero()),
        zero()
      );

      let transactionCount = matching.length;

      // Add acquisition costs from linked inventory records
      // to the Vehicle Acquisition Cost category.
      if (
        type === "COST_OF_SALES" &&
        category === "Vehicle Acquisition Cost"
      ) {
        amount = amount.plus(inventoryAcquisitionCost);
        transactionCount += inventoryAcquisitionCount;
      }

      return {
        category,
        amount: amount.toFixed(2),
        transactionCount,
      };
    });
  }

  function sumCategories(
    categories: { amount: string }[]
  ) {
    return categories.reduce(
      (total, category) => total.plus(category.amount),
      zero()
    );
  }

  const revenue = categoryTotals(
    "REVENUE",
    REVENUE_CATEGORIES
  );

  const costOfSales = categoryTotals(
    "COST_OF_SALES",
    COST_CATEGORIES
  );

  const operatingExpenses = categoryTotals(
    "OPERATING_EXPENSE",
    EXPENSE_CATEGORIES
  );

  const totalRevenue = sumCategories(revenue);
  const totalCostOfSales = sumCategories(costOfSales);
  const totalOperatingExpenses =
    sumCategories(operatingExpenses);

  const grossProfit = totalRevenue.minus(totalCostOfSales);
  const netIncome = grossProfit.minus(totalOperatingExpenses);

  // Warn about pending transactions.
  if (pendingTransactions.length > 0) {
    warnings.push(
      `${pendingTransactions.length} transaction(s) are awaiting manager review and are excluded from financial totals.`
    );
  }

  for (const transaction of pendingTransactions) {
    const amountMessage =
      transaction.amount === null
        ? "Amount is missing."
        : "Requires manager verification.";

    warnings.push(
      `Pending: "${transaction.description}" — ${amountMessage}`
    );
  }

  // Warn about invalid confirmed transactions.
  const missingConfirmedAmounts = transactions.filter(
    (transaction) => transaction.amount === null
  );

  if (missingConfirmedAmounts.length > 0) {
    warnings.push(
      `${missingConfirmedAmounts.length} confirmed transaction(s) have missing amounts and require correction.`
    );
  }

  return {
    success: true,
    period: {
      startDate,
      endDate,
    },
    currency: "PHP",
    incomeStatement: {
      revenue: {
        categories: revenue,
        total: totalRevenue.toFixed(2),
      },
      costOfSales: {
        categories: costOfSales,
        total: totalCostOfSales.toFixed(2),
      },
      grossProfit: grossProfit.toFixed(2),
      operatingExpenses: {
        categories: operatingExpenses,
        total: totalOperatingExpenses.toFixed(2),
      },
      netIncome: netIncome.toFixed(2),
    },
    transactionCount: transactions.length,
    pendingTransactionCount: pendingTransactions.length,
    totalTransactionCount:
      transactions.length + pendingTransactions.length,
    warnings,
    isProvisional: warnings.length > 0,
  };
}
