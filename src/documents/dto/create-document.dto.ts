import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum DocumentTypeDto {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  OTHER = 'OTHER',
}

export enum DocumentSourceDto {
  EXPENSE_EVENT = 'EXPENSE_EVENT',
  // เพิ่มได้ในอนาคต เช่น PROJECT, USER ฯลฯ
}

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentSourceDto })
  @IsEnum(DocumentSourceDto)
  sourceType!: DocumentSourceDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceId!: string;

  @ApiPropertyOptional({
    enum: DocumentTypeDto,
    default: DocumentTypeDto.OTHER,
  })
  @IsOptional()
  @IsEnum(DocumentTypeDto)
  type?: DocumentTypeDto;
}

export class ListDocumentsQueryDto {
  @ApiProperty({ enum: DocumentSourceDto })
  @IsEnum(DocumentSourceDto)
  sourceType!: DocumentSourceDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourceId!: string;
}

export class DownloadParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
