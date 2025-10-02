/*
  Warnings:

  - Added the required column `address` to the `expense_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerType` to the `expense_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNo` to the `expense_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telNo` to the `expense_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `websiteName` to the `expense_events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "public"."expense_events" ADD COLUMN     "address" VARCHAR(200) NOT NULL,
ADD COLUMN     "customerType" "public"."CustomerType" NOT NULL,
ADD COLUMN     "orderNo" VARCHAR(50) NOT NULL,
ADD COLUMN     "serviceFeeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFeePercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telNo" VARCHAR(12) NOT NULL,
ADD COLUMN     "websiteName" VARCHAR(200) NOT NULL,
ADD COLUMN     "withholdingTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingTaxPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."expense_items" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_items_eventId_idx" ON "public"."expense_items"("eventId");

-- AddForeignKey
ALTER TABLE "public"."expense_items" ADD CONSTRAINT "expense_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."expense_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
