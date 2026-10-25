"use client";

import { useState } from "react";
import {
    AlertTriangle,
    CalendarDays,
    Download,
    Loader2,
    RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type CategoryTotal = {
  category: string;
  amount: string;
  transactionCount: number;
};

type ReportSection = {
  categories: CategoryTotal[];
  total: string;
};

type IncomeStatementResponse = {
  success: true;
  period: {
    startDate: string;
    endDate: string;
  };
  currency: string;
  incomeStatement: {
    revenue: ReportSection;
    costOfSales: ReportSection;
    grossProfit: string;
    operatingExpenses: ReportSection;
    netIncome: string;
  };
  transactionCount: number;
  warnings: string[];
  isProvisional: boolean;
};

function manilaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function money(value: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

export default function ReportsPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [report, setReport] =
        useState<IncomeStatementResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function loadReport(start: string, end: string) {
        if (!start || !end || start > end) {
        setError("Please select a valid date range.");
        return;
        }

        setLoading(true);
        setError("");

        try {
        const query = new URLSearchParams({
            startDate: start,
            endDate: end,
        });

        const response = await fetch(
            `/api/reports/income-statement?${query.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
            result.message ?? "Failed to load income statement."
            );
        }

        setReport(result);
        } catch (err) {
        setReport(null);
        setError(
            err instanceof Error ? err.message : "Unexpected error."
        );
        } finally {
        setLoading(false);
        }
    }


    function selectMonthToDate() {
        const today = manilaToday();
        const firstDay = `${today.slice(0, 7)}-01`;

        setStartDate(firstDay);
        setEndDate(today);
        void loadReport(firstDay, today);
    }

    function selectToday() {
        const today = manilaToday();
        setStartDate(today);
        setEndDate(today);
        void loadReport(today, today);
    }

    const statement = report?.incomeStatement;

    

    async function downloadExcel() {
        if (!report) return;

        try {
            const query = new URLSearchParams({
            startDate: report.period.startDate,
            endDate: report.period.endDate,
            });

            const response = await fetch(
            `/api/reports/income-statement/export?${query.toString()}`
            );

            if (!response.ok) {
            throw new Error("Failed to download Excel report.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download =
            `dryve-income-statement-${report.period.startDate}-to-${report.period.endDate}.xlsx`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
        } catch (err) {
            setError(
            err instanceof Error
                ? err.message
                : "Excel download failed."
            );
        }
    }



    return (
        <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div>
            <Badge variant="secondary">DryvePH • Financial Reports</Badge>
            <h1 className="mt-3 text-3xl font-bold">
            Income Statement
            </h1>
            <p className="mt-2 text-muted-foreground">
            Financial performance based on confirmed manager recaps.
            </p>
        </div>

        <Card>
            <CardHeader>
                
            <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Reporting Period
            </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={selectToday}>
                Today
                </Button>
                <Button
                variant="outline"
                onClick={selectMonthToDate}
                >
                Month to Date
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                <label className="text-sm font-medium">
                    Start Date
                </label>
                <Input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                    setStartDate(event.target.value)
                    }
                />
                </div>

                <div className="space-y-2">
                <label className="text-sm font-medium">
                    End Date
                </label>
                <Input
                    type="date"
                    value={endDate}
                    onChange={(event) =>
                    setEndDate(event.target.value)
                    }
                />
                </div>
            </div>

            <Button
                onClick={() => loadReport(startDate, endDate)}
                disabled={loading}
            >
                {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                <RefreshCw className="mr-2 size-4" />
                )}
                Generate Report
            </Button>
            </CardContent>
        </Card>

        {error && (
            <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
            {error}
            </div>
        )}

        {loading && (
            <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading income statement...
            </p>
        )}

        {/* Empty state: before a report is generated */}
        {!report && !loading && !error && (
        <Card>
            <CardContent className="py-10 text-center">
            <p className="font-medium">
                Select a reporting period
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
                Click Today or Month to Date to generate your
                income statement, or choose a custom date range.
            </p>
            </CardContent>
        </Card>
        )}


        {report && statement && !loading && (
            <>
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        onClick={downloadExcel}
                    >
                        <Download className="mr-2 size-4" />
                        Download Excel
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                        Total Revenue
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                        {money(statement.revenue.total)}
                        </p>
                    </CardContent>
                    </Card>

                    <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                        Gross Profit
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                        {money(statement.grossProfit)}
                        </p>
                    </CardContent>
                    </Card>

                    <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                        Net Income
                        </p>
                        <p
                        className={`mt-2 text-2xl font-bold ${
                            Number(statement.netIncome) < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                        >
                        {money(statement.netIncome)}
                        </p>
                    </CardContent>
                    </Card>
                </div>

                {report.isProvisional && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="size-4" />
                        Provisional Report
                    </div>
                    {report.warnings.map((warning, index) => (
                        <p key={index} className="text-sm">
                        {warning}
                        </p>
                    ))}
                    </div>
                )}

                <Card>
                    <CardHeader>
                    <CardTitle>
                        Statement of Income
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {report.period.startDate} to{" "}
                        {report.period.endDate}
                    </p>
                    </CardHeader>

                    <CardContent className="space-y-5">
                    <StatementSection
                        title="Revenue"
                        section={statement.revenue}
                    />

                    <StatementSection
                        title="Cost of Sales"
                        section={statement.costOfSales}
                    />

                    <TotalRow
                        label="Gross Profit"
                        value={statement.grossProfit}
                    />

                    <StatementSection
                        title="Operating Expenses"
                        section={statement.operatingExpenses}
                    />

                    <div className="border-t-2 pt-4">
                        <TotalRow
                        label="Net Income"
                        value={statement.netIncome}
                        prominent
                        />
                    </div>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Based on {report.transactionCount} confirmed transactions.
                </p>
            </>
        )}
        </main>
    );
}

function StatementSection({
  title,
  section,
}: {
  title: string;
  section: ReportSection;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>

      {section.categories.map((item) => (
        <div
          key={item.category}
          className="flex justify-between gap-4 pl-4 text-sm"
        >
          <span className="text-muted-foreground">
            {item.category}
          </span>
          <span className="tabular-nums">
            {money(item.amount)}
          </span>
        </div>
      ))}

      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Total {title}</span>
        <span className="tabular-nums">
          {money(section.total)}
        </span>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 font-semibold ${
        prominent ? "text-xl" : "text-base"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  );
}
