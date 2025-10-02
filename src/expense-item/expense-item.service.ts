import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpenseItemService {
  constructor(private prisma: PrismaService) {}
}
