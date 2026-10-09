import { connection, NextRequest, NextResponse } from "next/server";

import {
  generateIncomeStatement,
  isValidReportDate,
  manilaToday,
} from "@/lib/reports/income-statement";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const params = request.nextUrl.searchParams;

    const today = manilaToday();
    const startDate = params.get("startDate") ?? today;
    const endDate = params.get("endDate") ?? today;

    if (
      !isValidReportDate(startDate) ||
      !isValidReportDate(endDate) ||
      startDate > endDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date range.",
        },
        { status: 400 }
      );
    }

    const report = await generateIncomeStatement(
      startDate,
      endDate
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error("Income statement error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate income statement.",
      },
      { status: 500 }
    );
  }
}
