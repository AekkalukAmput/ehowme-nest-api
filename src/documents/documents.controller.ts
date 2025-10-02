import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileStorageService } from 'src/files/file-storage.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentSourceDto, DocumentTypeDto } from './dto/create-document.dto';
import { Document } from '@prisma/client';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private storage: FileStorageService,
  ) {}

  @ApiOperation({
    summary:
      'Upload up to 10 files (≤20MB each) and link to a source (e.g., EXPENSE_EVENT)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: Object.values(DocumentTypeDto),
          default: DocumentTypeDto.OTHER,
        },
        sourceType: { type: 'string', enum: Object.values(DocumentSourceDto) },
        sourceId: { type: 'string', format: 'uuid' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['sourceType', 'sourceId', 'files'],
    },
  })
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  async upload(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    body: {
      type?: DocumentTypeDto;
      sourceType: DocumentSourceDto;
      sourceId: string;
    },
  ) {
    return this.documentsService.uploadMany(req.user.sub, body, files);
  }

  @ApiOperation({ summary: 'List documents by source' })
  @ApiQuery({ name: 'sourceType', enum: Object.values(DocumentSourceDto) })
  @ApiQuery({ name: 'sourceId', type: 'string', required: true })
  @Get()
  async list(
    @Req() req: any,
    @Query('sourceType') sourceType: DocumentSourceDto,
    @Query('sourceId') sourceId: string,
  ) {
    return this.documentsService.listBySource(
      req.user.sub,
      sourceType,
      sourceId,
    );
  }

  @ApiOperation({ summary: 'Download (LOCAL) / redirect (S3) a document' })
  @Get(':id')
  @Redirect() // จะ redirect เมื่อ return {url, statusCode}
  async download(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<StreamableFile | { url: string; statusCode?: number }> {
    const handle = await this.documentsService.getDownloadHandle(
      req.user.sub,
      id,
    );

    if (handle.type === 'redirect') {
      // S3 (public URL หรือ presigned URL)
      return { url: handle.url as string, statusCode: 302 };
    }

    // LOCAL: stream ไฟล์กลับเป็น StreamableFile (ไม่ต้องพึ่ง express.Response)
    const fileStream = fs.createReadStream(handle.path!);
    return new StreamableFile(fileStream, {
      type: handle.doc?.mimeType,
      disposition: `inline; filename="${encodeURIComponent(
        handle.doc!.originalName,
      )}"`,
    });
  }

  @ApiOperation({ summary: 'Delete a document' })
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.remove(req.user.sub, id);
  }
}
