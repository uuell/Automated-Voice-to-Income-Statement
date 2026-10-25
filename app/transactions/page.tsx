
"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Transaction = {
  id: string;
  recapId: string;
  recapDate: string;
  transactionDate: string;
  description: string;
  type: string;
  category: string;
  amount: string | null;
  status: "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED";
  notes: string | null;
  sourceText: string | null;
  reviewFlags: string[];
  vehicleId: string | null;
  vehicle: {
    id: string;
    plateNumber: string | null;
    make: string | null;
    model: string;
    year: number | null;
    status: string;
  } | null;
};

type Vehicle = {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string;
  year: number | null;
  status: "IN_STOCK" | "RESERVED" | "SOLD";
};


const ACCOUNTING_CATEGORIES: Record<string, string[]> = {
  REVENUE: ["Vehicle Sales", "Other Income"],
  COST_OF_SALES: ["Vehicle Acquisition Cost", "Reconditioning"],
  OPERATING_EXPENSE: [
    "Salaries and Commissions",
    "Transport and Fuel",
    "Rent and Utilities",
    "Marketing",
    "Office and Admin",
    "Miscellaneous",
  ],
  INVENTORY_PURCHASE: ["Vehicle Inventory"],
  CUSTOMER_DEPOSIT: ["Customer Deposits"],
};


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [linkingTransactionId, setLinkingTransactionId] =
    useState<string | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [savingLink, setSavingLink] = useState(false);
    const [linkError, setLinkError] = useState("");
    const [linkSuccess, setLinkSuccess] = useState("");

    const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
    const [editedAmount, setEditedAmount] = useState("");

    
    const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
    const [editedDescription, setEditedDescription] = useState("");
    const [editedCategory, setEditedCategory] = useState("");
    const [editedNotes, setEditedNotes] = useState("");


    
    async function confirmGeneralTransaction(transactionId: string) {
        const transaction = transactions.find(
            (item) => item.id === transactionId
        );

        if (!transaction) return;

        const confirmed = window.confirm(
            `Confirm this transaction?\n\n` +
            `${transaction.description}\n` +
            `Category: ${transaction.category}\n` +
            `Amount: ${formatCurrency(transaction.amount)}\n\n` +
            `This will include the transaction in the financial reports.\n\n` +
            `Continue only if the amount and classification have been verified.`
        );

        if (!confirmed) return;

        setSavingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const response = await fetch(
            `/api/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                action: "CONFIRM",
                }),
            }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message ?? "Failed to confirm transaction."
            );
            }

            setLinkSuccess(
            `Transaction confirmed: ${transaction.description}`
            );

            await loadTransactions();
        } catch (err) {
            setLinkError(
            err instanceof Error
                ? err.message
                : "Unable to confirm transaction."
            );
        } finally {
            setSavingLink(false);
        }
    }

    
    function startEditingDetails(transaction: Transaction) {
        setEditingDetailsId(transaction.id);
        setEditedDescription(transaction.description);
        setEditedCategory(transaction.category);
        setEditedNotes(transaction.notes ?? "");

        setLinkError("");
        setLinkSuccess("");
    }

    function cancelEditingDetails() {
        setEditingDetailsId(null);
        setEditedDescription("");
        setEditedCategory("");
        setEditedNotes("");
        setLinkError("");
    }


    
    async function saveTransactionDetails(transactionId: string) {
        const transaction = transactions.find(
            (item) => item.id === transactionId
        );

        if (!transaction) return;

        const description = editedDescription.trim();
        const category = editedCategory;
        const notes = editedNotes.trim() || null;

        if (!description) {
            setLinkError("Transaction description is required.");
            return;
        }

        if (description.length > 500) {
            setLinkError("Description cannot exceed 500 characters.");
            return;
        }

        if (editedNotes.trim().length > 2000) {
            setLinkError("Notes cannot exceed 2000 characters.");
            return;
        }

        if (!ACCOUNTING_CATEGORIES[transaction.type]?.includes(category)) {
            setLinkError("Select a valid category for this transaction.");
            return;
        }

        if (
            transaction.vehicleId !== null &&
            category !== transaction.category
        ) {
            setLinkError(
            "You cannot change the category of a vehicle-linked transaction."
            );
            return;
        }

        const verified = window.confirm(
            `Save corrected details for "${transaction.description}"?\n\n` +
            `New description: ${description}\n` +
            `New category: ${category}\n\n` +
            "Changes will be recorded in the audit history. " +
            "The transaction will remain pending until separately confirmed."
        );

        if (!verified) return;

        setSavingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const response = await fetch(
            `/api/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                action: "UPDATE_DETAILS",
                description,
                category,
                notes,
                }),
            }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message ?? "Failed to update transaction details."
            );
            }

            setLinkSuccess(
            `Details updated for "${description}".`
            );

            setEditingDetailsId(null);
            setEditedDescription("");
            setEditedCategory("");
            setEditedNotes("");

            await loadTransactions();
        } catch (err) {
            setLinkError(
            err instanceof Error
                ? err.message
                : "Unable to update transaction details."
            );
        } finally {
            setSavingLink(false);
        }
    }


    function startEditingAmount(transaction: Transaction) {
    setEditingAmountId(transaction.id);
    setEditedAmount(transaction.amount ?? "");
    setLinkError("");
    setLinkSuccess("");
    }

    function cancelEditingAmount() {
    setEditingAmountId(null);
    setEditedAmount("");
    setLinkError("");
    }

    async function saveTransactionAmount(transactionId: string) {
    const transaction = transactions.find(
        (item) => item.id === transactionId
    );

    if (!transaction) return;

    const amount = editedAmount.trim();

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
        setLinkError(
        "Enter a positive amount with up to two decimal places."
        );
        return;
    }

    const verified = window.confirm(
        `Save the verified amount of ${formatCurrency(amount)} for "${transaction.description}"?\n\n` +
        "This correction will be recorded in the audit history. " +
        "The transaction will remain pending until separately confirmed."
    );

    if (!verified) return;

    setSavingLink(true);
    setLinkError("");
    setLinkSuccess("");

    try {
        const response = await fetch(
        `/api/transactions/${encodeURIComponent(transactionId)}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            action: "UPDATE_AMOUNT",
            amount,
            }),
        }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
        throw new Error(
            result.message ?? "Failed to update amount."
        );
        }

        setLinkSuccess(
        `Amount updated for "${transaction.description}".`
        );
        setEditingAmountId(null);
        setEditedAmount("");

        await loadTransactions();
    } catch (err) {
        setLinkError(
        err instanceof Error
            ? err.message
            : "Unable to update amount."
        );
    } finally {
        setSavingLink(false);
    }
    }


  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/transactions", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Failed to load transactions."
        );
      }

      setTransactions(result.transactions);
      setLoaded(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve transactions."
      );
    } finally {
      setLoading(false);
    }
  }
  
    async function startLinking(transactionId: string) {
    setLinkingTransactionId(transactionId);
    setSelectedVehicleId("");
    setLinkError("");
    setLinkSuccess("");

    try {
        const response = await fetch("/api/vehicles", {
        cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
        throw new Error(
            result.message ?? "Failed to load vehicles."
        );
        }

        setVehicles(result.vehicles);
    } catch (err) {
        setLinkError(
        err instanceof Error
            ? err.message
            : "Unable to load inventory."
        );
    }
    }

    function cancelLinking() {
        setLinkingTransactionId(null);
        setSelectedVehicleId("");
        setLinkError("");
    }

    async function saveVehicleLink(transactionId: string) {
        if (!selectedVehicleId) {
            setLinkError("Please select a vehicle.");
            return;
        }

        setSavingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const response = await fetch(
            `/api/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "LINK_VEHICLE",
                vehicleId: selectedVehicleId,
                }),
            }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message ?? "Failed to link vehicle."
            );
            }

            setLinkSuccess("Vehicle linked successfully.");
            setLinkingTransactionId(null);
            setSelectedVehicleId("");

            await loadTransactions();
        } catch (err) {
            setLinkError(
            err instanceof Error
                ? err.message
                : "Unable to link vehicle."
            );
        } finally {
            setSavingLink(false);
        }
    }

        async function resolveReviewFlags(transactionId: string) {
        const transaction = transactions.find(
            (item) => item.id === transactionId
        );

        if (!transaction) return;

        const verified = window.confirm(
            `Have you verified every review flag for "${transaction.description}" against the original recap and supporting records?\n\nThis will clear all review flags and record the action in the audit history.`
        );

        if (!verified) return;

        setSavingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const response = await fetch(
            `/api/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                action: "RESOLVE_FLAGS",
                }),
            }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message ?? "Failed to resolve review flags."
            );
            }

            setLinkSuccess(
            `Review flags resolved for "${transaction.description}".`
            );

            await loadTransactions();
        } catch (err) {
            setLinkError(
            err instanceof Error
                ? err.message
                : "Unable to resolve review flags."
            );
        } finally {
            setSavingLink(false);
        }
    }

    
    async function confirmVehicleSale(transactionId: string) {
        const transaction = transactions.find(
            (item) => item.id === transactionId
        );

        if (!transaction) return;

        const confirmed = window.confirm(
            `Confirm the following vehicle sale?\n\n` +
            `${transaction.description}\n` +
            `Sale amount: ${formatCurrency(transaction.amount)}\n\n` +
            `This will recognize the sale as revenue, recognize the vehicle's acquisition cost, and mark the vehicle as SOLD.\n\n` +
            `Only continue if you have verified the sale and its inventory record.`
        );

        if (!confirmed) return;

        setSavingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const response = await fetch(
            `/api/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                action: "CONFIRM",
                }),
            }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message ?? "Failed to confirm vehicle sale."
            );
            }

            setLinkSuccess(
            `Sale confirmed successfully: ${transaction.description}`
            );

            await loadTransactions();
        } catch (err) {
            setLinkError(
            err instanceof Error
                ? err.message
                : "Unable to confirm vehicle sale."
            );
        } finally {
            setSavingLink(false);
        }
    }



  function formatCurrency(amount: string | null) {
    if (amount === null) {
      return "Missing amount";
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(amount));
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  }

  const pendingCount = transactions.filter(
    (transaction) => transaction.status === "NEEDS_REVIEW"
  ).length;

  const historicalIssues = transactions.filter(
    (transaction) => transaction.status === "CONFIRMED"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Transaction Review
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review pending transactions and historical
            vehicle sales with missing inventory links.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={loadTransactions}
          disabled={loading}
        >
          <RefreshCw
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Loading..." : "Load / Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Total Issues
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? transactions.length : "—"}
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Pending Review
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? pendingCount : "—"}
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Historical Issues
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {loaded ? historicalIssues : "—"}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {linkError && !linkingTransactionId && (
        <p role="alert" className="text-sm text-destructive">
            {linkError}
        </p>
        )}

        {linkSuccess && (
        <p role="status" className="text-sm text-green-600">
            {linkSuccess}
        </p>
        )}

      <section className="rounded-xl border">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">
            Transactions Requiring Attention
          </h2>
        </div>

        {!loaded ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Click Load / Refresh to retrieve transactions.
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No transactions require attention.
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {transactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {transaction.description}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(transaction.transactionDate)}
                      {" · "}
                      {transaction.category}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transaction.status === "CONFIRMED"
                        ? "Historical Issue"
                        : "Needs Review"}
                    </p>
                  </div>
                </div>

                {transaction.reviewFlags.length > 0 && (
                  <div className="mt-4 rounded-md bg-muted/50 p-3">
                    <p className="text-sm font-medium">
                      Issues to Resolve
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {transaction.reviewFlags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                    {transaction.status === "NEEDS_REVIEW" &&
                        transaction.reviewFlags.length > 0 && (
                            <Button
                            type="button"
                            variant="outline"
                            className="mt-3"
                            disabled={savingLink}
                            onClick={() =>  resolveReviewFlags(transaction.id)}
                            >
                            {savingLink ? "Saving..." : "Resolve Flags"}
                            </Button>
                        )}
                  </div>
                )}

                {transaction.sourceText && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Original Transcript
                    </p>
                    <p className="mt-1 text-sm italic">
                      &ldquo;{transaction.sourceText}&rdquo;
                    </p>
                  </div>
                )}

                                
                {transaction.notes && (
                <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                    Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                    {transaction.notes}
                    </p>
                </div>
                )}


                {transaction.vehicle && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Linked vehicle:{" "}
                    {[
                      transaction.vehicle.year,
                      transaction.vehicle.make,
                      transaction.vehicle.model,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
                {transaction.type === "REVENUE" &&
                transaction.category === "Vehicle Sales" &&
                !transaction.vehicleId && (
                    <div className="mt-4 border-t pt-4">
                    {linkingTransactionId !== transaction.id ? (
                        <Button
                        type="button"
                        variant="outline"
                        onClick={() => startLinking(transaction.id)}
                        >
                        Link Vehicle
                        </Button>
                    ) : (
                        <div className="space-y-3">
                        <label
                            htmlFor={`vehicle-${transaction.id}`}
                            className="block text-sm font-medium"
                        >
                            Select Registered Vehicle
                        </label>

                        <select
                            id={`vehicle-${transaction.id}`}
                            value={selectedVehicleId}
                            onChange={(event) =>
                            setSelectedVehicleId(event.target.value)
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="">Select a vehicle...</option>

                            {vehicles.map((vehicle) => (
                            <option
                                key={vehicle.id}
                                value={vehicle.id}
                                disabled={vehicle.status === "SOLD"}
                            >
                                {[
                                vehicle.year,
                                vehicle.make,
                                vehicle.model,
                                ]
                                .filter(Boolean)
                                .join(" ")}
                                {vehicle.plateNumber
                                ? ` (${vehicle.plateNumber})`
                                : ""}
                                {` — ${vehicle.status.replace("_", " ")}`}
                            </option>
                            ))}
                        </select>

                        {linkError && (
                            <p
                            role="alert"
                            className="text-sm text-destructive"
                            >
                            {linkError}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Linking a confirmed historical sale will mark
                            the selected vehicle as SOLD. Pending sales
                            will remain pending until confirmed.
                        </p>

                        <div className="flex gap-2">
                            <Button
                            type="button"
                            onClick={() => saveVehicleLink(transaction.id)}
                            disabled={savingLink || !selectedVehicleId}
                            >
                            {savingLink ? "Saving..." : "Save Vehicle Link"}
                            </Button>

                            <Button
                            type="button"
                            variant="outline"
                            onClick={cancelLinking}
                            disabled={savingLink}
                            >
                            Cancel
                            </Button>
                        </div>
                        </div>
                    )}
                    </div>
                )}
                {transaction.type === "REVENUE" &&
                transaction.category === "Vehicle Sales" &&
                transaction.status === "NEEDS_REVIEW" &&
                transaction.vehicleId &&
                transaction.amount !== null &&
                transaction.reviewFlags.length === 0 && (
                    <div className="mt-4 border-t pt-4">
                    <Button
                        type="button"
                        disabled={savingLink}
                        onClick={() => confirmVehicleSale(transaction.id)}
                    >
                        {savingLink ? "Confirming..." : "Confirm Sale"}
                    </Button>
                    </div>
                )}

                
                {transaction.status === "NEEDS_REVIEW" && (
                <div className="mt-4 border-t pt-4">
                    {editingDetailsId !== transaction.id ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={savingLink}
                        onClick={() => startEditingDetails(transaction)}
                    >
                        Edit Details
                    </Button>
                    ) : (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold">
                        Edit Transaction Details
                        </h4>

                        <div className="space-y-2">
                        <label
                            htmlFor={`description-${transaction.id}`}
                            className="block text-sm font-medium"
                        >
                            Description
                        </label>

                        <input
                            id={`description-${transaction.id}`}
                            type="text"
                            value={editedDescription}
                            onChange={(event) =>
                            setEditedDescription(event.target.value)
                            }
                            maxLength={500}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        />
                        </div>

                        <div className="space-y-2">
                        <label
                            htmlFor={`category-${transaction.id}`}
                            className="block text-sm font-medium"
                        >
                            Category
                        </label>

                        <select
                            id={`category-${transaction.id}`}
                            value={editedCategory}
                            onChange={(event) =>
                            setEditedCategory(event.target.value)
                            }
                            disabled={transaction.vehicleId !== null}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
                        >
                            {(ACCOUNTING_CATEGORIES[transaction.type] ?? []).map(
                            (category) => (
                                <option key={category} value={category}>
                                {category}
                                </option>
                            )
                            )}
                        </select>

                        {transaction.vehicleId !== null && (
                            <p className="text-xs text-muted-foreground">
                            Category changes are disabled for transactions
                            already linked to a vehicle.
                            </p>
                        )}
                        </div>

                        <div className="space-y-2">
                        <label
                            htmlFor={`notes-${transaction.id}`}
                            className="block text-sm font-medium"
                        >
                            Notes
                        </label>

                        <textarea
                            id={`notes-${transaction.id}`}
                            value={editedNotes}
                            onChange={(event) =>
                            setEditedNotes(event.target.value)
                            }
                            maxLength={2000}
                            rows={3}
                            placeholder="Add verified transaction details..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                        </div>

                        <p className="text-xs text-muted-foreground">
                        Changes are recorded in the audit history.
                        The original transcript remains unchanged.
                        Saving details will not confirm the transaction.
                        </p>

                        {linkError && (
                        <p role="alert" className="text-sm text-destructive">
                            {linkError}
                        </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            disabled={savingLink}
                            onClick={() => saveTransactionDetails(transaction.id)}
                        >
                            {savingLink ? "Saving..." : "Save Details"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={savingLink}
                            onClick={cancelEditingDetails}
                        >
                            Cancel
                        </Button>
                        </div>
                    </div>
                    )}
                </div>
                )}

                {transaction.status === "NEEDS_REVIEW" && (
                <div className="mt-4 border-t pt-4">
                    {editingAmountId !== transaction.id ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={savingLink}
                        onClick={() => startEditingAmount(transaction)}
                    >
                        Edit Amount
                    </Button>
                    ) : (
                    <div className="space-y-3">
                        <label
                        htmlFor={`amount-${transaction.id}`}
                        className="block text-sm font-medium"
                        >
                        Verified Transaction Amount (PHP)
                        </label>

                        <input
                        id={`amount-${transaction.id}`}
                        type="text"
                        inputMode="decimal"
                        value={editedAmount}
                        onChange={(event) =>
                            setEditedAmount(event.target.value)
                        }
                        placeholder="e.g. 3500.00"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        />

                        <p className="text-xs text-muted-foreground">
                        Enter an amount verified from a bill, receipt,
                        or other supporting record. Saving it will not
                        confirm the transaction.
                        </p>

                        {linkError && (
                        <p role="alert" className="text-sm text-destructive">
                            {linkError}
                        </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            disabled={savingLink}
                            onClick={() =>
                            saveTransactionAmount(transaction.id)
                            }
                        >
                            {savingLink ? "Saving..." : "Save Amount"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            disabled={savingLink}
                            onClick={cancelEditingAmount}
                        >
                            Cancel
                        </Button>
                        </div>
                    </div>
                    )}
                </div>
                )}
                {transaction.status === "NEEDS_REVIEW" &&
                transaction.type !== "INVENTORY_PURCHASE" &&
                !(
                    transaction.type === "COST_OF_SALES" &&
                    transaction.category === "Vehicle Acquisition Cost"
                ) &&
                !(
                    transaction.type === "REVENUE" &&
                    transaction.category === "Vehicle Sales"
                ) &&
                !transaction.vehicleId &&
                transaction.amount !== null &&
                Number(transaction.amount) > 0 &&
                transaction.reviewFlags.length === 0 && (
                    <div className="mt-4 border-t pt-4">
                    <Button
                        type="button"
                        disabled={savingLink}
                        onClick={() =>
                        confirmGeneralTransaction(transaction.id)
                        }
                    >
                        {savingLink ? "Confirming..." : "Confirm Transaction"}
                    </Button>
                    </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
