
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CarFront,
  ClipboardList,
  LayoutDashboard,
  Mic,
  FileBarChart,
} from "lucide-react";

const navigation = [
  {
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Voice Recap",
    href: "/recap",
    icon: Mic,
  },
  {
    label: "Review Queue",
    href: "/transactions",
    icon: ClipboardList,
  },
  {
    label: "Vehicle Inventory",
    href: "/vehicles",
    icon: CarFront,
  },
  {
    label: "Income Statement",
    href: "/report",
    icon: FileBarChart,
  },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CarFront className="size-5" />
          </div>

          <div>
            <p className="text-sm font-bold leading-tight">
              AI powered
            </p>
            <p className="text-xs text-muted-foreground">
              Voice-to-Income Statement
            </p>
          </div>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
