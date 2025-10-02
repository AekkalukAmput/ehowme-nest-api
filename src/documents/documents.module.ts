import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { FileStorageService } from 'src/files/file-storage.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, FileStorageService],
})
export class DocumentsModule {}
