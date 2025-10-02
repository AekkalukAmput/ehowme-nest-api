-- CreateEnum
CREATE TYPE "public"."FileStorageProvider" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('RECEIPT', 'INVOICE', 'IMAGE', 'PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentSource" AS ENUM ('EXPENSE_EVENT');

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(150) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "ext" VARCHAR(20),
    "checksumSha256" VARCHAR(64),
    "type" "public"."DocumentType" NOT NULL DEFAULT 'OTHER',
    "storage" "public"."FileStorageProvider" NOT NULL DEFAULT 'LOCAL',
    "bucket" VARCHAR(100),
    "key" VARCHAR(500) NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_links" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "sourceType" "public"."DocumentSource" NOT NULL,
    "sourceId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "public"."documents"("userId");

-- CreateIndex
CREATE INDEX "documents_storage_bucket_key_idx" ON "public"."documents"("storage", "bucket", "key");

-- CreateIndex
CREATE INDEX "document_links_sourceType_sourceId_idx" ON "public"."document_links"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "document_links_documentId_sourceType_sourceId_key" ON "public"."document_links"("documentId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_links" ADD CONSTRAINT "document_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
