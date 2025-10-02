import { ApiProperty } from '@nestjs/swagger';
import { FileStorageProvider, Prisma } from '@prisma/client';
import { DocumentTypeDto } from '../dto/create-document.dto';

export class Document {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() byteSize!: number;
  @ApiProperty({ nullable: true }) ext?: string | null;

  // ใช้ enum จาก Prisma ตรง ๆ
  @ApiProperty({ enum: Object.values(FileStorageProvider) })
  storage!: FileStorageProvider;

  @ApiProperty({ nullable: true }) bucket?: string | null;
  @ApiProperty() key!: string;
  @ApiProperty({ nullable: true }) url?: string | null;
  @ApiProperty({ nullable: true }) checksumSha256?: string | null;

  @ApiProperty({ enum: Object.values(DocumentTypeDto) })
  type!: DocumentTypeDto;

  // ให้ตรงกับ Prisma
  @ApiProperty({ nullable: true })
  metadata?: Prisma.JsonValue | null;

  // แปลงเป็น ISO string เวลาแม็ป
  @ApiProperty() createdAt!: string;
}
