/*
  Warnings:

  - A unique constraint covering the columns `[userId,seq]` on the table `expense_events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seq` to the `expense_events` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `expense_events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."expense_events" ADD COLUMN IF NOT EXISTS "seq" INTEGER;
UPDATE "public"."expense_events" SET "category" = 'Uncategorized' WHERE "category" IS NULL;
ALTER TABLE "public"."expense_events" ALTER COLUMN "category" SET NOT NULL;

WITH numbered AS (
  SELECT
    e."id",
    ROW_NUMBER() OVER (
      PARTITION BY e."userId"
      ORDER BY e."date", e."createdAt", e."id"
    ) AS rn
  FROM "public"."expense_events" e
  WHERE e."seq" IS NULL
)
UPDATE "public"."expense_events" AS t
SET "seq" = n.rn
FROM numbered n
WHERE t."id" = n."id";

ALTER TABLE "public"."expense_events"
  ALTER COLUMN "seq" SET NOT NULL;
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expense_events_userId_seq_key"
  ON "public"."expense_events"("userId", "seq");

-- CreateTable
CREATE TABLE "public"."expense_event_counters" (
    "userId" UUID NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_event_counters_pkey" PRIMARY KEY ("userId")
);

INSERT INTO "public"."expense_event_counters" ("userId","lastSeq")
SELECT "userId", MAX("seq")
FROM "public"."expense_events"
GROUP BY "userId"
ON CONFLICT ("userId") DO UPDATE SET "lastSeq" = EXCLUDED."lastSeq";
