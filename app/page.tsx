
import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  ClipboardList,
  FileBarChart,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Voice Recap",
    description:
      "Record or upload a manager's daily recap, transcribe it, and extract financial transactions using AI.",
    href: "/recap",
    icon: Mic,
    action: "Start Voice Recap",
  },
  {
    title: "Transaction Review",
    description:
      "Review pending transactions, correct missing amounts, resolve issues, and confirm verified records.",
    href: "/transactions",
    icon: ClipboardList,
    action: "Open Review Queue",
  },
  {
    title: "Vehicle Inventory",
    description:
      "Register vehicles, track acquisition costs, and manage inventory throughout the sales process.",
    href: "/vehicles",
    icon: CarFront,
    action: "Manage Inventory",
  },
  {
    title: "Income Statement",
    description:
      "Generate daily or date-range financial statements with revenue, cost of sales, expenses, and Excel export.",
    href: "/report",
    icon: FileBarChart,
    action: "View Financial Reports",
  },
];

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:py-14">
        <section className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-4" />
            AI-Powered Financial Operations
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Financial Workspace
            </h1>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Turn daily voice recaps into structured financial
              transactions, manage vehicle inventory, and generate
              income statements from verified records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/recap"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Mic className="size-4" />
              Start New Recap
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/transactions"
              className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ClipboardList className="size-4" />
              Review Transactions
            </Link>
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Workspace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access the tools used in your daily financial workflow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group flex flex-col justify-between gap-6 rounded-xl border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/30"
                >
                  <div className="space-y-4">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {feature.title}
                      </h3>

                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    {feature.action}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-6 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">
              Human-Verified Financial Reporting
            </h2>

            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-extracted transactions are reviewed before
              confirmation. Missing amounts and unresolved issues
              remain pending instead of being silently included in
              financial statements.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
