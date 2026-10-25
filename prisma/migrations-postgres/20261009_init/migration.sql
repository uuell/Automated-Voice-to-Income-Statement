-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RecapStatus" AS ENUM ('DRAFT', 'PROCESSING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REVENUE', 'COST_OF_SALES', 'OPERATING_EXPENSE', 'INVENTORY_PURCHASE', 'CUSTOMER_DEPOSIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NEEDS_REVIEW', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD');

-- CreateTable
CREATE TABLE "Recap" (
    "id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "recapDate" TIMESTAMP(3) NOT NULL,
    "status" "RecapStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT,
    "make" TEXT,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "acquisitionCost" DECIMAL(65,30),
    "acquisitionDate" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "recapId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "description" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30),
    "status" "TransactionStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "reviewFlags" TEXT,
    "sourceText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionReview" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "Recap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionReview" ADD CONSTRAINT "TransactionReview_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
