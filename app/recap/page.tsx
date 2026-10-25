
"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload, 
  AudioLines,
  Mic, 
  Square
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TransactionType =
  | "REVENUE"
  | "COST_OF_SALES"
  | "OPERATING_EXPENSE"
  | "INVENTORY_PURCHASE"
  | "CUSTOMER_DEPOSIT";

type Transaction = {
  description: string;
  type: TransactionType;
  category: string;
  amount: string | null;
  sourceText: string;
  notes: string | null;
  reviewFlags: string[];
  vehicleId?: string | null;
};

type Vehicle = {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string;
  variant: string | null;
  year: number | null;
  acquisitionCost: string | null;
  status: "IN_STOCK" | "RESERVED" | "SOLD";
};

const transactionTypes: TransactionType[] = [
  "REVENUE",
  "COST_OF_SALES",
  "OPERATING_EXPENSE",
  "INVENTORY_PURCHASE",
  "CUSTOMER_DEPOSIT",
];


const accountingCategories: Record<TransactionType, string[]> = {
  REVENUE: [
    "Vehicle Sales",
    "Other Income",
  ],
  COST_OF_SALES: [
    "Vehicle Acquisition Cost",
    "Reconditioning",
  ],
  OPERATING_EXPENSE: [
    "Salaries and Commissions",
    "Transport and Fuel",
    "Rent and Utilities",
    "Marketing",
    "Office and Admin",
    "Miscellaneous",
  ],
  INVENTORY_PURCHASE: [
    "Vehicle Inventory",
  ],
  CUSTOMER_DEPOSIT: [
    "Customer Deposits",
  ],
};


const SAMPLE_TRANSCRIPT = "Fuel for the transport truck, 3,200. Ay mali, 3,500 pala. Then commission ni Mark, 5,000.";

export default function RecapPage() {
    const [transcript, setTranscript] = useState("");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [extracted, setExtracted] = useState(false);

    const [transcribing, setTranscribing] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState("");

    const [isRecording, setIsRecording] = useState(false);

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [vehicleError, setVehicleError] = useState("");

    const [recapDate, setRecapDate] = useState("");

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioStreamRef = useRef<MediaStream | null>(null);

    
    async function loadVehicles() {
        setLoadingVehicles(true);
        setVehicleError("");

        try {
            const response = await fetch("/api/vehicles", {
            cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load vehicles."
            );
            }

            setVehicles(result.vehicles);
        } catch (err) {
            setVehicleError(
            err instanceof Error
                ? err.message
                : "Failed to load vehicles."
            );
        } finally {
            setLoadingVehicles(false);
        }
    }


    async function extractTransactions() {
        setLoading(true);
        setError("");
        setExtracted(false);
        setTransactions([]);
        setSaveSuccess("");

        try {
        const response = await fetch("/api/extract", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ transcript }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
            result.message || "Transaction extraction failed"
            );
        }

        setTransactions(result.data.transactions);
        setExtracted(true);
        } catch (err) {
        setError(
            err instanceof Error ? err.message : "Something went wrong"
        );
        } finally {
        setLoading(false);
        }
    }

    function updateTransaction(
        index: number,
        field: keyof Transaction,
        value: string
    ) {
        setTransactions((previous) =>
        previous.map((transaction, i) =>
            i === index
            ? {
                ...transaction,
                [field]: value,
                }
            : transaction
        )
        );
    }

    
    function changeTransactionType(
        index: number,
        type: TransactionType
        ) {
        setTransactions((previous) =>
            previous.map((transaction, i) =>
            i === index
                ? {
                    ...transaction,
                    type,
                    category: accountingCategories[type][0],
                }
                : transaction
            )
        );
    }

    function resolveReviewFlag(
        transactionIndex: number,
        flagIndex: number
        ) {
        setTransactions((previous) =>
            previous.map((transaction, index) => {
            if (index !== transactionIndex) {
                return transaction;
            }

            const flag = transaction.reviewFlags[flagIndex];

            if (!flag) {
                return transaction;
            }

            const remainingFlags = transaction.reviewFlags.filter(
                (_, index) => index !== flagIndex
            );

            const reviewNote = `Manager resolved: ${flag}`;

            return {
                ...transaction,
                reviewFlags: remainingFlags,
                notes: [transaction.notes, reviewNote]
                .filter(Boolean)
                .join("\n"),
            };
            })
        );
    }


    function removeTransaction(index: number) {
        setTransactions((previous) =>
        previous.filter((_, i) => i !== index)
        );
    }

    function addTransaction() {
        setTransactions((previous) => [
        ...previous,
        {
            description: "",
            type: "OPERATING_EXPENSE",
            category: "Miscellaneous",
            amount: null,
            sourceText: "",
            notes: null,
            vehicleId: null,
            reviewFlags: [],
        },
        ]);
    }

    function formatAmount(amount: string | null) {
        if (!amount) return "Missing amount";

        const number = Number(amount);

        if (!Number.isFinite(number)) {
        return "Invalid amount";
        }

        return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        }).format(number);
    }


    async function confirmAndSave() {
            setSaving(true);
            setError("");
            setSaveSuccess("");

            try {
                if (!recapDate) {
                    setError("Please select a recap date.");
                    return;
                }
                const response = await fetch("/api/recaps", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    transcript,
                    recapDate,
                    transactions: transactions.map((transaction) => ({
                        ...transaction,
                        amount:
                        transaction.amount?.trim() === ""
                            ? null
                            : transaction.amount,
                    })),
                }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to save transactions"
                );
                }

                setSaveSuccess(
                `Successfully saved ${result.transactionCount} transactions.`
                );
                setExtracted(false);
                setTransactions([]);
            } catch (err) {
                setError(
                err instanceof Error ? err.message : "Something went wrong"
                );
            } finally {
                setSaving(false);
            }
        }

        async function transcribeAudio() {
            if (!audioFile) return;

            setTranscribing(true);
            setError("");

            try {
                const formData = new FormData();
                formData.append("audio", audioFile);

                const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                throw new Error(
                    result.message ?? "Audio transcription failed."
                );
                }

                setTranscript(result.transcript);
                setTransactions([]);
                setExtracted(false);
                setSaveSuccess("")
            } catch (err) {
                setError(
                err instanceof Error
                    ? err.message
                    : "Failed to transcribe audio."
                );
            } finally {
                setTranscribing(false);
            }
        }

    
        async function startRecording() {
            setError("");

            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    "Microphone recording is not supported in this browser."
                );
                }

                if (!window.MediaRecorder) {
                throw new Error(
                    "Audio recording is not supported in this browser."
                );
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                });

                audioStreamRef.current = stream;
                audioChunksRef.current = [];

                const preferredType = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/mp4",
                ].find((type) => MediaRecorder.isTypeSupported(type));

                const recorder = new MediaRecorder(
                stream,
                preferredType ? { mimeType: preferredType } : undefined
                );

                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
                };

                recorder.onstop = () => {
                const mimeType = recorder.mimeType || "audio/webm";

                const extension = mimeType.includes("mp4")
                    ? "mp4"
                    : "webm";

                const blob = new Blob(audioChunksRef.current, {
                    type: mimeType,
                });

                if (blob.size > 0) {
                    const file = new File(
                    [blob],
                    `recap-${Date.now()}.${extension}`,
                    { type: mimeType }
                    );

                    setAudioFile(file);
                }

                stream.getTracks().forEach((track) => track.stop());

                audioStreamRef.current = null;
                mediaRecorderRef.current = null;
                audioChunksRef.current = [];
                };

                recorder.onerror = () => {
                setError("An error occurred while recording audio.");

                stream.getTracks().forEach((track) => track.stop());

                audioStreamRef.current = null;
                setIsRecording(false);
                };

                recorder.start(1000);
                setIsRecording(true);
            } catch (err) {
                audioStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());

                audioStreamRef.current = null;

                setError(
                err instanceof Error
                    ? err.message
                    : "Unable to access microphone."
                );
            }
        }

        function stopRecording() {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state === "recording") {
                recorder.stop();
            }

            setIsRecording(false);
        }


    return (
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div>
            <Badge variant="secondary">AI Automated</Badge>
            <h1 className="mt-3 text-3xl font-bold">
            Voice-to-Income Statement
            </h1>
            <p className="mt-2 text-muted-foreground">
            Convert a manager recap into editable financial transactions.
            </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>Daily Manager Recap</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <AudioLines className="size-5" />
                    Audio Transcription
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        {!isRecording ? (
                            <Button
                            type="button"
                            onClick={startRecording}
                            disabled={transcribing || loading || saving}
                            >
                            <Mic className="mr-2 size-4" />
                            Start Recording
                            </Button>
                        ) : (
                            <Button
                            type="button"
                            variant="destructive"
                            onClick={stopRecording}
                            >
                            <Square className="mr-2 size-4" />
                            Stop Recording
                            </Button>
                        )}

                        {isRecording && (
                            <span className="flex items-center gap-2 text-sm text-red-600">
                            <span className="size-2 animate-pulse rounded-full bg-red-600" />
                            Recording...
                            </span>
                        )}
                    </div>
                    <Input
                    type="file"
                    accept=".mp3,.m4a,.wav,.webm,.ogg,.flac,.mp4"
                    onChange={(event) => {
                        setAudioFile(event.target.files?.[0] ?? null);
                    }}
                    />

                    {audioFile && (
                    <p className="text-sm text-muted-foreground">
                        Selected: {audioFile.name}
                    </p>
                    )}

                    <Button
                    onClick={transcribeAudio}
                    disabled={!audioFile || transcribing || loading || saving}
                    >
                    {transcribing ? (
                        <>
                        <AudioLines className="mr-2 size-4 animate-pulse" />
                        Transcribing...
                        </>
                    ) : (
                        <>
                        <Upload className="mr-2 size-4" />
                        Transcribe Audio
                        </>
                    )}
                    </Button>
                </CardContent>

            </Card>
            
                <Textarea
                rows={12}
                value={transcript}
                onChange={(event) => {
                    setTranscript(event.target.value);
                    setExtracted(false);
                    setTransactions([]);
                }}
                placeholder="Paste an English, Tagalog, or Taglish recap..."
                />
                <div
                role="note"
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4"
                >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                <div className="space-y-1">
                    <p className="text-sm font-medium">
                    Review your transcript before extraction
                    </p>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                    Review vehicle names, plate numbers, amounts, payment terms,
                    and corrections before extracting transactions. Speech
                    recognition may mishear these details.
                    </p>
                </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                <Button
                    onClick={extractTransactions}
                    disabled={loading || transcript.trim().length < 5}
                >
                    {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 size-4" />
                    )}
                    {loading ? "Extracting..." : "Extract Transactions"}
                </Button>

                <Button
                    variant="outline"
                    onClick={() => {
                    setTranscript(SAMPLE_TRANSCRIPT);
                    setTransactions([]);
                    setExtracted(false);
                    setError("");
                    }}
                >
                    Load Sample
                </Button>
                </div>

                {error && (
                <div
                    role="alert"
                    className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                </div>
                )}

                {saveSuccess && (
                <div
                    role="status"
                    className="flex gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700"
                >
                    <CheckCircle2 className="size-4 shrink-0" />
                    {saveSuccess}
                </div>
                )}
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Review Summary</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                    Transactions
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                    {transactions.length}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">
                    Need Attention
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                    {
                        transactions.filter(
                        (item) =>
                            !item.amount ||
                            item.reviewFlags.length > 0
                        ).length
                    }
                    </p>
                </div>
                </div>

                {extracted ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="size-4" />
                    Extraction completed. Review all entries before saving.
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">
                    Extract a transcript to review its transactions.
                </p>
                )}

                <p className="text-xs text-muted-foreground">
                No transactions are saved automatically.
                </p>
            </CardContent>
            </Card>
        </div>

        {extracted && (
            <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                <h2 className="text-2xl font-semibold">
                    Extracted Transactions
                </h2>
                <p className="text-sm text-muted-foreground">
                    Edit descriptions, categories, and amounts as needed.
                </p>
                </div>

                <Button variant="outline" onClick={addTransaction}>
                <Plus className="mr-2 size-4" />
                Add Transaction
                </Button>
            </div>

            {transactions.map((transaction, index) => (
                <Card key={index}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                        Transaction {index + 1}
                    </CardTitle>

                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove transaction ${index + 1}`}
                        onClick={() => removeTransaction(index)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                            Description
                            </label>
                            <Input
                            value={transaction.description}
                            onChange={(event) =>
                                updateTransaction(
                                index,
                                "description",
                                event.target.value
                                )
                            }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                            Amount (PHP)
                            </label>
                            <Input
                            type="text"
                            inputMode="decimal"
                            value={transaction.amount ?? ""}
                            onChange={(event) =>
                                updateTransaction(
                                index,
                                "amount",
                                event.target.value
                                )
                            }
                            placeholder="Enter amount"
                            />
                            <p className="text-xs text-muted-foreground">
                            {formatAmount(transaction.amount)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                            Transaction Type
                            </label>
                            <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            value={transaction.type}
                            onChange={(event) =>
                                changeTransactionType(
                                    index,
                                    event.target.value as TransactionType
                                )
                            }
                            >
                            {transactionTypes.map((type) => (
                                <option key={type} value={type}>
                                {type.replaceAll("_", " ")}
                                </option>
                            ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                            Category
                            </label>
                            <select
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                value={transaction.category}
                                onChange={(event) =>
                                    updateTransaction(
                                    index,
                                    "category",
                                    event.target.value
                                    )
                                }
                                >
                                {!accountingCategories[transaction.type].includes(
                                    transaction.category
                                ) && (
                                    <option value={transaction.category} disabled>
                                    Invalid: {transaction.category}
                                    </option>
                                )}

                                {accountingCategories[transaction.type].map(
                                    (category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    
                    {(
                    transaction.type === "REVENUE" &&
                    transaction.category === "Vehicle Sales"
                    ) || transaction.type === "INVENTORY_PURCHASE" ? (
                    <div className="space-y-2 rounded-md border p-3">
                        <label className="text-sm font-medium">
                        Linked Vehicle
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={loadVehicles}
                            disabled={loadingVehicles}
                        >
                            {loadingVehicles
                            ? "Loading vehicles..."
                            : "Load / Refresh Inventory"}
                        </Button>

                        {vehicleError && (
                            <span className="text-sm text-destructive">
                            {vehicleError}
                            </span>
                        )}
                        </div>

                        <select
                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={transaction.vehicleId ?? ""}
                        onChange={(event) =>
                            setTransactions((previous) =>
                            previous.map((item, i) =>
                                i === index
                                ? {
                                    ...item,
                                    vehicleId: event.target.value || null,
                                    }
                                : item
                            )
                            )
                        }
                        >
                        <option value="">No vehicle selected</option>


                            {vehicles.map((vehicle) => {
                            const isSold = vehicle.status === "SOLD";

                            return (
                                <option
                                key={vehicle.id}
                                value={vehicle.id}
                                disabled={
                                    isSold &&
                                    transaction.type === "REVENUE" &&
                                    transaction.category === "Vehicle Sales"
                                }
                                >
                                {[
                                    vehicle.year,
                                    vehicle.make,
                                    vehicle.model,
                                    vehicle.plateNumber
                                    ? `(${vehicle.plateNumber})`
                                    : "(No plate)",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                {" — "}
                                {vehicle.status}
                                {isSold ? " (Already sold)" : ""}
                                </option>
                            );
                            })}

                        </select>

                        {transaction.vehicleId && (
                        <p className="text-xs text-muted-foreground">
                            {(() => {
                            const vehicle = vehicles.find(
                                (item) => item.id === transaction.vehicleId
                            );

                            if (!vehicle) {
                                return "Selected vehicle not found.";
                            }

                            return vehicle.acquisitionCost
                                ? `Recorded acquisition cost: ₱${Number(
                                    vehicle.acquisitionCost
                                ).toLocaleString("en-PH")}`
                                : "Acquisition cost is not recorded.";
                            })()}
                        </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                        Select the matching vehicle from inventory.
                        Verify the plate number and vehicle details before linking.
                        </p>
                    </div>
                    ) : null}



                    {transaction.reviewFlags.length > 0 && (
                    <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-amber-600" />
                        <p className="text-sm font-semibold">
                            Requires Manager Review
                        </p>
                        </div>

                        <p className="text-xs text-muted-foreground">
                        Verify each warning against the original recap or
                        supporting records before resolving it.
                        </p>

                        {transaction.reviewFlags.map((flag, flagIndex) => (
                        <div
                            key={`${flag}-${flagIndex}`}
                            className="space-y-2 rounded-md border bg-background p-3"
                        >
                            <p className="text-sm">{flag}</p>

                            <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => resolveReviewFlag(index, flagIndex)}
                            >
                            <CheckCircle2 className="mr-2 size-4" />
                            Mark as Verified
                            </Button>
                        </div>
                        ))}
                    </div>
                    )}


                    {transaction.sourceText && (
                    <div className="rounded-md bg-muted p-3">
                        <p className="mb-1 text-xs font-medium">
                        Original transcript
                        </p>
                        <p className="text-sm text-muted-foreground">
                        {transaction.sourceText}
                        </p>
                    </div>
                    )}
                </CardContent>
                </Card>
            ))}

            <div className="flex justify-end">
                <div className="space-y-2">
                    <input
                        id="recap-date"
                        type="date"
                        value={recapDate}
                        onChange={(event) => setRecapDate(event.target.value)}
                        className="h-8 w-full rounded-md border bg-background px-4 text-sm"
                        required
                    />
                </div>
                <Button
                    onClick={confirmAndSave}
                    disabled={
                        saving ||
                        transactions.length === 0 ||
                        transactions.some(
                            (transaction) =>
                            !transaction.description.trim() ||
                            (transaction.amount !== null &&
                                transaction.amount.trim() !== "" &&
                                !/^\d+(\.\d{1,2})?$/.test(transaction.amount)) ||
                            !accountingCategories[transaction.type].includes(
                                transaction.category
                            )
                        )
                    }
                >
                    {saving ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                        <CheckCircle2 className="mr-2 size-4" />
                    )}
                    {saving ? "Saving..." : "Save Reviewed Recap"}
                </Button>
            </div>

            <p className="text-right text-xs text-muted-foreground">
                Only manager-confirmed transactions are saved to the database.
            </p>
            </section>
        )}
        </main>
    );
}
