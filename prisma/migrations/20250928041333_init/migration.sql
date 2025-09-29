-- CreateEnum
CREATE TYPE "public"."ExpenseType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "public"."expense_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."ExpenseType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" VARCHAR(100),
    "title" VARCHAR(200),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_events_userId_date_idx" ON "public"."expense_events"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."expense_events" ADD CONSTRAINT "expense_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
