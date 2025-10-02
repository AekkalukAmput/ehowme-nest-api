import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { DocumentsService } from 'src/documents/documents.service';
import { FileStorageService } from 'src/files/file-storage.service';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, DocumentsService, FileStorageService],
})
export class ExpenseModule {}
