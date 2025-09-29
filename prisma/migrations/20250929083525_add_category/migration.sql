/*
  Warnings:

  - You are about to drop the column `title` on the `expense_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."expense_events" DROP COLUMN "title",
ADD COLUMN     "expenseCategoryId" UUID;

-- CreateTable
CREATE TABLE "public"."expense_categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "public"."ExpenseType" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_categories_userId_type_parentId_idx" ON "public"."expense_categories"("userId", "type", "parentId");

-- AddForeignKey
ALTER TABLE "public"."expense_events" ADD CONSTRAINT "expense_events_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "public"."expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_categories" ADD CONSTRAINT "expense_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_categories" ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
