# DryvePH Voice-to-Income Statement

An AI-assisted financial reporting prototype developed for the **DryvePH IT Support Specialist technical assessment**.

The application converts spoken daily business recaps into structured financial transactions, allows managers to review and correct AI-generated information, and produces income statements based on confirmed records.

It is designed around a simple principle: **AI assists with data entry, but managers verify the information before it affects financial reports.**

## Features

### Voice Recording and Transcription
- Record daily financial recaps using a microphone or upload an audio file.
- Transcribe English, Filipino, and Taglish speech using Groq Whisper.
- Review and edit the transcript before transaction extraction.

### AI-Powered Transaction Extraction
- Identify multiple financial transactions from a single recap.
- Extract descriptions, amounts, accounting categories, and supporting source text.
- Handle spoken corrections and self-corrections.
- Flag missing amounts and uncertain information instead of inventing values.

### Transaction Review Queue
- Review transactions that require manager attention.
- Correct descriptions, categories, notes, and amounts.
- Resolve review flags after verifying the underlying information.
- Link vehicle sales to registered inventory.
- Confirm eligible transactions separately.
- Record transaction corrections in an audit history.

### Vehicle Inventory
- Register and manage vehicle records.
- Track inventory status and acquisition costs.
- Link relevant financial transactions to specific vehicles.
- Update vehicle status when a sale is confirmed.
- Use registered acquisition costs when calculating the cost of sold vehicles.

### Income Statement and Excel Export
- Generate income statements for a selected date range.
- View revenue, cost of sales, gross profit, operating expenses, and net income.
- Exclude pending transactions from confirmed financial totals.
- Display warnings when information is incomplete.
- Export the report to an Excel workbook.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend and backend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | SQLite |
| ORM | Prisma 7 |
| Speech recognition | Groq Whisper |
| AI transaction extraction | Groq LLM |
| Validation | Zod |
| Excel reports | ExcelJS |

## How It Works

1. **Capture the recap:** A manager records or uploads a daily financial update.
2. **Transcribe the audio:** Whisper converts speech into editable text.
3. **Extract transactions:** An LLM identifies financial events and structures the results.
4. **Review the results:** The manager checks descriptions, amounts, categories, and uncertainties.
5. **Save transactions:** Verified information is stored in SQLite, with unresolved entries remaining pending.
6. **Resolve outstanding items:** Managers update missing details, link vehicles, and confirm eligible transactions.
7. **Generate reports:** The application calculates an income statement using confirmed transactions and exports the results to Excel.

## Accounting Safeguards

The prototype distinguishes between several transaction types:

| Transaction type | Treatment |
|---|---|
| Revenue | Included in income when confirmed |
| Cost of sales | Deducted from revenue when applicable |
| Operating expenses | Deducted when confirmed |
| Inventory purchases | Recorded as inventory activity rather than an immediate operating expense |
| Customer deposits | Kept separate from recognized revenue |

For confirmed vehicle sales, registered vehicle acquisition costs can be recognized as cost of sales.

Transactions with unresolved flags or missing amounts remain pending. Reports are labeled **provisional** when unresolved transactions or other reporting uncertainties exist.

The application does not assume that AI-extracted amounts or classifications are always correct.

## Local Setup

### Prerequisites

- Node.js and npm
- A Groq API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the placeholder Groq API key with your own.

The project uses the following environment variables:

```dotenv
DATABASE_URL="file:./dev.db"
GROQ_API_KEY="your_groq_api_key_here"
GROQ_CHAT_MODEL="openai/gpt-oss-120b"
GROQ_TRANSCRIPTION_MODEL="whisper-large-v3"
```

Never commit your actual API key.

### 3. Initialize the database

```bash
npx prisma generate
npx prisma migrate deploy
```

This creates the local database structure using the included migrations.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run in production mode

```bash
npm run build
npm run start
```

## Application Pages

| Route | Purpose |
|---|---|
| `/` | Financial workspace home |
| `/recap` | Voice recording, transcription, extraction, and initial review |
| `/transactions` | Pending transaction review and corrections |
| `/vehicles` | Vehicle inventory management |
| `/report` | Income statement and Excel export |

## Example Workflow

A manager records:

> "Today we sold the Toyota Innova for 690,000 pesos. We also paid 3,500 for electricity. The towing expense was 4,000—sorry, make that 4,500."

The application attempts to identify the financial events, apply the corrected towing amount, and present the extracted transactions for review.

The manager then verifies the details, associates the vehicle sale with the correct inventory record, and saves the results.

Confirmed financial transactions become available for income statement reporting.

*This example is illustrative. AI extraction may require corrections before confirmation.*

## Known Limitations

- AI transcription and transaction extraction are not guaranteed to be accurate; human review is required.
- Vehicle purchases, partial payments, deposits, and recognition timing may require additional manual accounting judgment.
- The application is a local SQLite-based prototype, not a production multi-user accounting system.
- Authentication, role-based access control, and broader deployment security are not implemented.
- Historical or incomplete transactions can leave reports provisional.
- Financial results are intended for demonstration and review, not as independently audited statements.

## Development and Testing

The application has been manually tested for key workflows, including transcription, transaction extraction, review and corrections, vehicle linking, income statement generation, and Excel export.

A production build was completed successfully using:

```bash
npm run build
```

## Project Scope

This application was developed as a technical assessment prototype to demonstrate AI-assisted workflow automation, full-stack development, database-backed business processes, validation, and practical financial reporting.

It is not an official DryvePH accounting system.