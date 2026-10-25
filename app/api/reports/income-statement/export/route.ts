import { connection, NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

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

    const statement = report.incomeStatement;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DryvePH Voice Income";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Income Statement");

    sheet.columns = [
      { key: "description", width: 40 },
      { key: "amount", width: 22 },
    ];

    sheet.mergeCells("A1:B1");
    sheet.getCell("A1").value = "DRYVEPH";
    sheet.getCell("A1").font = {
      bold: true,
      size: 18,
      color: { argb: "FFFFFFFF" },
    };
    sheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17365D" },
    };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:B2");
    sheet.getCell("A2").value = "STATEMENT OF INCOME";
    sheet.getCell("A2").font = {
      bold: true,
      size: 14,
    };

    sheet.addRow({
      description: "Reporting Period",
      amount: `${startDate} to ${endDate}`,
    });

    sheet.addRow({
      description: "Currency",
      amount: "PHP",
    });

    sheet.addRow([]);

    const currencyFormat = '"₱"#,##0.00;[Red]("₱"#,##0.00)';

    function addSection(
      title: string,
      categories: {
        category: string;
        amount: string;
      }[],
      total: string
    ) {
      const heading = sheet.addRow([title, ""]);
      heading.font = { bold: true };

      heading.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE8EFF7" },
      };

      for (const category of categories) {
        const row = sheet.addRow([
          `    ${category.category}`,
          Number(category.amount),
        ]);

        row.getCell(2).numFmt = currencyFormat;
      }

      addTotal(`Total ${title}`, total);
      sheet.addRow([]);
    }

    function addTotal(label: string, amount: string) {
      const row = sheet.addRow([
        label,
        Number(amount),
      ]);

      row.font = { bold: true };
      row.getCell(2).numFmt = currencyFormat;

      row.getCell(1).border = {
        top: { style: "thin" },
      };

      row.getCell(2).border = {
        top: { style: "thin" },
      };
    }

    addSection(
      "REVENUE",
      statement.revenue.categories,
      statement.revenue.total
    );

    addSection(
      "COST OF SALES",
      statement.costOfSales.categories,
      statement.costOfSales.total
    );

    addTotal("GROSS PROFIT", statement.grossProfit);
    sheet.addRow([]);

    addSection(
      "OPERATING EXPENSES",
      statement.operatingExpenses.categories,
      statement.operatingExpenses.total
    );

    const netRow = sheet.addRow([
      "NET INCOME",
      Number(statement.netIncome),
    ]);

    netRow.font = {
      bold: true,
      size: 13,
    };

    netRow.getCell(2).numFmt = currencyFormat;

    netRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCEAF7" },
    };

    sheet.addRow([]);
    sheet.addRow([
      "Confirmed Transactions",
      report.transactionCount,
    ]);

    sheet.addRow([
      "Report Status",
      report.isProvisional ? "PROVISIONAL" : "NO WARNINGS",
    ]);

    if (report.warnings.length > 0) {
      sheet.addRow([]);
      const warningHeading = sheet.addRow([
        "REVIEW WARNINGS",
      ]);
      warningHeading.font = { bold: true };

      for (const warning of report.warnings) {
        const row = sheet.addRow([warning]);
        row.getCell(1).alignment = {
          wrapText: true,
        };
        row.height = 45;
      }
    }

    sheet.getColumn(2).alignment = {
      horizontal: "right",
    };

    sheet.views = [
      {
        state: "frozen",
        ySplit: 2,
      },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const filename =
      `dryve-income-statement-${startDate}-to-${endDate}.xlsx`;

    return new NextResponse(
      new Uint8Array(buffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Excel export failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to export income statement.",
      },
      { status: 500 }
    );
  }
}
