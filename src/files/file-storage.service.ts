import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

type PutResult = {
  key: string;
  bucket?: string;
  url?: string;
  etag?: string;
  checksumSha256: string;
};

@Injectable()
export class FileStorageService {
  private driver = (process.env.FILES_DRIVER || 'local').toLowerCase();
  private maxBytes = 20 * 1024 * 1024; // 20MB

  async put(
    buffer: Buffer,
    opts: {
      userId: string;
      eventId: string;
      originalName: string;
      mimeType: string;
    },
  ): Promise<PutResult> {
    if (buffer.length > this.maxBytes) {
      throw new BadRequestException('File too large (>20MB)');
    }
    const checksumSha256 = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');
    const safeName = opts.originalName.replace(/[^\w.\-ก-๙ ]+/g, '_');
    const ext = path.extname(safeName).replace(/^\./, '');
    const fileId = crypto.randomUUID();
    const key = `${opts.userId}/${opts.eventId}/${fileId}${ext ? '.' + ext : ''}`;

    if (this.driver === 's3') {
      const {
        S3_ENDPOINT,
        S3_REGION,
        S3_BUCKET,
        S3_ACCESS_KEY,
        S3_SECRET_KEY,
        S3_USE_PATH_STYLE,
        S3_PUBLIC_BASE,
      } = process.env;
      if (!S3_BUCKET) throw new Error('S3_BUCKET is required');
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: S3_REGION || 'auto',
        endpoint: S3_ENDPOINT,
        credentials:
          S3_ACCESS_KEY && S3_SECRET_KEY
            ? { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY }
            : undefined,
        forcePathStyle: String(S3_USE_PATH_STYLE || 'true') === 'true',
      });
      const put = await client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: opts.mimeType,
          Metadata: { originalName: safeName, checksumSha256 },
        }),
      );
      const etag = (put.ETag || '').replace(/"/g, '');
      const url = process.env.S3_PUBLIC_BASE
        ? `${process.env.S3_PUBLIC_BASE.replace(/\/+$/, '')}/${key}`
        : undefined;
      return { key, bucket: S3_BUCKET, url, etag, checksumSha256 };
    }

    // LOCAL
    const base =
      process.env.FILES_LOCAL_BASE || path.resolve(process.cwd(), 'uploads');
    const fullPath = path.join(base, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { key, checksumSha256 };
  }

  async streamLocal(key: string) {
    const base =
      process.env.FILES_LOCAL_BASE || path.resolve(process.cwd(), 'uploads');
    return path.join(base, key);
  }

  async delete(key: string, bucket?: string) {
    if (this.driver === 's3') {
      const { S3Client, DeleteObjectCommand } = await import(
        '@aws-sdk/client-s3'
      );
      const client = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials:
          process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
            ? {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY,
              }
            : undefined,
        forcePathStyle:
          String(process.env.S3_USE_PATH_STYLE || 'true') === 'true',
      });
      await client.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
      return;
    }
    const base =
      process.env.FILES_LOCAL_BASE || path.resolve(process.cwd(), 'uploads');
    const fullPath = path.join(base, key);
    try {
      await fs.unlink(fullPath);
    } catch {
      /* ignore */
    }
  }
}
