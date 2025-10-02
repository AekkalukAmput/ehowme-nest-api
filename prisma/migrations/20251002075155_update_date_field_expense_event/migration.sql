/*
  Warnings:

  - You are about to drop the column `date` on the `expense_events` table. All the data in the column will be lost.
  - Added the required column `startProjectDate` to the `expense_events` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."expense_events_userId_date_idx";

-- AlterTable
ALTER TABLE "public"."expense_events" DROP COLUMN "date",
ADD COLUMN     "startProjectDate" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "expense_events_userId_startProjectDate_idx" ON "public"."expense_events"("userId", "startProjectDate");
