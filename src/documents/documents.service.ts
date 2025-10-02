import { BadRequestException, Injectable } from '@nestjs/common';
import type { Document as DocumentModel } from '@prisma/client';
import * as path from 'node:path';
import { FileStorageService } from 'src/files/file-storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentSourceDto, DocumentTypeDto } from './dto/create-document.dto';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: FileStorageService,
  ) {}

  /** ตรวจสอบว่า sourceId เป็นของผู้ใช้จริง (เพิ่ม source ใหม่ๆ ที่นี่) */
  private async assertSourceOwned(
    userId: string,
    sourceType: DocumentSourceDto,
    sourceId: string,
  ) {
    if (sourceType === DocumentSourceDto.EXPENSE_EVENT) {
      const ok = await this.prisma.expenseEvent.findFirst({
        where: { id: sourceId, userId },
        select: { id: true },
      });
      if (!ok)
        throw new BadRequestException('ExpenseEvent not found or not yours');
      return;
    }
    throw new BadRequestException('Unsupported sourceType');
  }

  private toEntity(d: DocumentModel): Document {
    return {
      id: d.id,
      userId: d.userId,
      originalName: d.originalName,
      mimeType: d.mimeType,
      byteSize: d.byteSize,
      ext: d.ext,
      checksumSha256: d.checksumSha256 ?? undefined,
      storage: d.storage as any, // 'LOCAL' | 'S3'
      bucket: d.bucket ?? undefined,
      key: d.key,
      url: d.url ?? undefined,
      type: d.type as DocumentTypeDto, // 'RECEIPT' | 'INVOICE' | ...
      metadata: (d.metadata as any) ?? undefined,
      createdAt: d.createdAt.toISOString(),
    };
  }

  /** อัปโหลดหลายไฟล์ (≤20MB/ไฟล์) แล้วผูก DocumentLink กับ source */
  async uploadMany(
    userId: string,
    body: {
      sourceType: DocumentSourceDto;
      sourceId: string;
      type?: DocumentTypeDto;
    },
    files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No files');
    await this.assertSourceOwned(userId, body.sourceType, body.sourceId);

    const out: Document[] = [];
    for (const f of files) {
      const put = await this.storage.put(f.buffer, {
        userId,
        eventId: body.sourceId, // เอาไว้จัดผัง key ให้แยกตามที่มา
        originalName: f.originalname,
        mimeType: f.mimetype || 'application/octet-stream',
      });

      const doc = await this.prisma.document.create({
        data: {
          userId,
          originalName: f.originalname,
          mimeType: f.mimetype || 'application/octet-stream',
          byteSize: f.size,
          ext: path.extname(f.originalname).replace(/^\./, '') || null,
          checksumSha256: put.checksumSha256,
          type: (body.type as DocumentTypeDto) ?? DocumentTypeDto.OTHER,
          storage:
            (process.env.FILES_DRIVER || 'local').toUpperCase() === 'S3'
              ? 'S3'
              : 'LOCAL',
          bucket: put.bucket || null,
          key: put.key,
          url: put.url || null,
        },
      });

      await this.prisma.documentLink.create({
        data: {
          documentId: doc.id,
          sourceType: body.sourceType as DocumentSourceDto,
          sourceId: body.sourceId,
        },
      });

      out.push(this.toEntity(doc));
    }
    return out;
  }

  async listBySource(
    userId: string,
    sourceType: DocumentSourceDto,
    sourceId: string,
  ) {
    await this.assertSourceOwned(userId, sourceType, sourceId);
    return this.prisma.document.findMany({
      where: {
        userId,
        deletedAt: null,
        links: {
          some: { sourceType: sourceType as DocumentSourceDto, sourceId },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        byteSize: true,
        url: true,
        key: true,
        type: true,
        createdAt: true,
      },
    });
  }

  async getOne(userId: string, id: string): Promise<Document> {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!doc) throw new BadRequestException('Document not found');
    return this.toEntity(doc);
  }

  private async presignS3(bucket: string, key: string): Promise<string> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials:
        process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY!,
              secretAccessKey: process.env.S3_SECRET_KEY!,
            }
          : undefined,
      forcePathStyle:
        String(process.env.S3_USE_PATH_STYLE || 'true') === 'true',
    });

    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 60 },
    );
  }

  /** คืน URL สำหรับดาวน์โหลด (S3 presigned) หรือ path local (ไปสตรีมต่อใน controller) */
  async getDownloadHandle(userId: string, id: string) {
    const doc = await this.getOne(userId, id);

    if (process.env.FILES_DRIVER === 's3') {
      // ถ้าเก็บเป็น public URL ไว้แล้ว ใช้เลย
      if (doc.url) return { type: 'redirect', url: doc.url };
      // มิฉะนั้น สร้าง presigned URL ชั่วคราว
      const url = await this.presignS3(doc.bucket!, doc.key);
      return { type: 'redirect', url };
    }

    // LOCAL: ส่ง path กลับไปให้ controller stream
    const fullPath = await this.storage.streamLocal(doc.key);
    return { type: 'local', path: fullPath, doc };
  }

  async remove(userId: string, id: string) {
    const doc = await this.getOne(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.storage.delete(doc.key, doc.bucket || undefined);
    });
    return { success: true };
  }
}
