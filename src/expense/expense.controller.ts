import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ListExpenseEventsDto } from './dto/list-expense-events.dto';
import { ExpenseService } from './expense.service';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  DocumentSourceDto,
  DocumentTypeDto,
} from 'src/documents/dto/create-document.dto';
import { DocumentsService } from 'src/documents/documents.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@ApiTags('expense')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('expense-events')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly documentsService: DocumentsService,
  ) {}

  @ApiOperation({
    summary: 'List expense events',
    operationId: 'listExpenseEvents',
  })
  @Get()
  async list(@Req() req: any, @Query() q: ListExpenseEventsDto) {
    return this.expenseService.list(req.user.sub, q);
  }

  @ApiOperation({
    summary: 'Get one expense event',
    operationId: 'getExpenseEvent',
  })
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.expenseService.get(req.user.sub, id);
  }

  private parseJson<T>(value: unknown, field: string): T {
    if (typeof value !== 'string') {
      throw new BadRequestException(`Field "${field}" must be JSON string`);
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new BadRequestException(`Field "${field}" has invalid JSON`);
    }
  }

  @ApiOperation({
    summary: 'Create expense event (with optional files)',
    operationId: 'createExpenseEvent',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON string of CreateExpenseDto',
        },
        docType: {
          type: 'string',
          enum: Object.values(DocumentTypeDto),
          default: 'RECEIPT',
        },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['data'],
    },
  })
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB/ไฟล์
    }),
  )
  async create(
    @Req() req: any,
    @Body('data') dataJson: string,
    @Body('docType') docType?: DocumentTypeDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const dto = this.parseJson<CreateExpenseDto>(dataJson, 'data');
    const created = await this.expenseService.create(req.user.sub, dto);

    if (files?.length) {
      await this.documentsService.uploadMany(
        req.user.sub,
        {
          sourceType: DocumentSourceDto.EXPENSE_EVENT,
          sourceId: created.id,
          type: docType ?? DocumentTypeDto.RECEIPT,
        },
        files,
      );
    }
    return created;
  }

  @ApiOperation({
    summary: 'Update expense event (with optional files)',
    operationId: 'updateExpenseEvent',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'JSON string of UpdateExpenseDto',
        },
        docType: {
          type: 'string',
          enum: Object.values(DocumentTypeDto),
          default: 'RECEIPT',
        },
        replaceFiles: {
          type: 'boolean',
          default: false,
          description: 'ถ้า true จะลบไฟล์เดิมทั้งหมดก่อนอัปใหม่',
        },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['data'],
    },
  })
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body('data') dataJson: string,
    @Body('docType') docType?: DocumentTypeDto,
    @Body('replaceFiles') replaceFiles?: string | boolean,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const patch = this.parseJson<UpdateExpenseDto>(dataJson, 'data');
    const updated = await this.expenseService.update(req.user.sub, id, patch);

    const wantReplace =
      typeof replaceFiles === 'string'
        ? replaceFiles === 'true'
        : !!replaceFiles;

    if (files?.length) {
      if (wantReplace) {
        // ลบไฟล์เดิมทั้งหมดของอีเวนต์นี้ก่อน
        const oldDocs = await this.documentsService.listBySource(
          req.user.sub,
          DocumentSourceDto.EXPENSE_EVENT,
          id,
        );
        for (const d of oldDocs) {
          await this.documentsService.remove(req.user.sub, d.id);
        }
      }
      await this.documentsService.uploadMany(
        req.user.sub,
        {
          sourceType: DocumentSourceDto.EXPENSE_EVENT,
          sourceId: id,
          type: docType ?? DocumentTypeDto.RECEIPT,
        },
        files,
      );
    }

    return updated;
  }

  @ApiOperation({
    summary: 'Delete expense event',
    operationId: 'deleteExpenseEvent',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.expenseService.remove(req.user.sub, id);
    return;
  }

  @ApiOperation({
    summary: 'Summary totals',
    operationId: 'summaryExpenseEvents',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @Get('~summary')
  async summary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expenseService.summary(req.user.sub, { from, to });
  }
}
