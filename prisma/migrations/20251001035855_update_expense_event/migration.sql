-- AlterTable
ALTER TABLE "public"."expense_events" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "customerType" SET DEFAULT 'INDIVIDUAL',
ALTER COLUMN "serviceFeePercent" SET DEFAULT 10,
ALTER COLUMN "telNo" DROP NOT NULL,
ALTER COLUMN "withholdingTaxPercent" SET DEFAULT 3;
