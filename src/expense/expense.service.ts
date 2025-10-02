import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerType, ExpenseType, Prisma } from '@prisma/client';
import { CreateExpenseItemDto } from 'src/expense-item/dto/create-expense-item.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateUtils } from 'typeorm/util/DateUtils.js';

function startOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}`);
}
function endOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}`);
}

function toDto(e: any) {
  return {
    id: e.id,
    seq: e.seq,
    startProjectDate: e.startProjectDate.toISOString(),
    type: e.type === 'INCOME' ? 'income' : 'expense',
    amount: Number(e.amount),
    category: e.category,
    note: e.note ?? undefined,
    orderNo: e.orderNo,
    websiteName: e.websiteName,
    address: e.address ?? undefined,
    telNo: e.telNo ?? undefined,
    customerType: e.customerType,
    withholdingTaxPercent: e.withholdingTaxPercent,
    withholdingTaxAmount: e.withholdingTaxAmount,
    serviceFeePercent: e.serviceFeePercent,
    serviceFeeAmount: e.serviceFeeAmount,
    expenseItems: e.expenseItems ?? [],
  } as const;
}

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  private async nextSeq(tx: PrismaService, userId: string): Promise<number> {
    // กรณีเริ่มต้น: create { lastSeq: 1 }, ถ้ามีอยู่แล้ว: increment 1
    // ตรงนี้ปลอดภัยจาก race เพราะ UPDATE with increment เป็น atomic
    try {
      const row = await tx.expenseEventCounter.upsert({
        where: { userId },
        create: { userId, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });
      return row.lastSeq;
    } catch (e: any) {
      // กันกรณีชนกันตอน create (P2002) → ลองใหม่
      if (e?.code === 'P2002') {
        const row = await tx.expenseEventCounter.update({
          where: { userId },
          data: { lastSeq: { increment: 1 } },
        });
        return row.lastSeq;
      }
      throw e;
    }
  }

  async list(
    userId: string,
    q: { from?: string; to?: string; type?: 'income' | 'expense' },
  ) {
    const where: Prisma.ExpenseEventWhereInput = { userId };
    if (q.from && q.to) {
      where.startProjectDate = {
        gte: startOfDayUTC(q.from),
        lte: endOfDayUTC(q.to),
      };
    } else if (q.from) {
      where.startProjectDate = { gte: startOfDayUTC(q.from) };
    } else if (q.to) {
      where.startProjectDate = { lte: endOfDayUTC(q.to) };
    }
    if (q.type)
      where.type =
        q.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE;

    const rows = await this.prisma.expenseEvent.findMany({
      where,
      orderBy: { startProjectDate: 'desc' },
    });
    return rows.map(toDto);
  }

  async get(userId: string, id: string) {
    const e = await this.prisma.expenseEvent.findFirst({
      where: { id, userId },
    });
    if (!e) throw new NotFoundException('Event not found');
    return toDto(e);
  }

  async create(
    userId: string,
    data: {
      startProjectDate: string;
      type: 'income' | 'expense';
      amount: number;
      category: string;
      note?: string;
      orderNo: string;
      websiteName: string;
      address?: string;
      telNo?: string;
      customerType: 'individual' | 'company';
      withholdingTaxPercent: number;
      withholdingTaxAmount: number;
      serviceFeePercent: number;
      serviceFeeAmount: number;
      expenseItems?: CreateExpenseItemDto[];
    },
  ) {
    if (data.amount <= 0)
      throw new BadRequestException('Amount must be positive');
    const created = await this.prisma.$transaction(async (tx) => {
      const seq = await this.nextSeq(tx as any, userId);
      return tx.expenseEvent.create({
        data: {
          userId,
          seq,
          startProjectDate: startOfDayUTC(data.startProjectDate),
          type:
            data.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE,
          amount: new Prisma.Decimal(data.amount),
          category: data.category.trim() || 'อื่นๆ',
          note: data.note?.trim() || null,
          orderNo: data.orderNo,
          websiteName: data.websiteName,
          address: data.address,
          telNo: data.telNo,
          customerType:
            (data.customerType as CustomerType) || CustomerType.INDIVIDUAL,
          withholdingTaxPercent: data.withholdingTaxPercent,
          withholdingTaxAmount: new Prisma.Decimal(
            data.withholdingTaxAmount ?? 0,
          ),
          serviceFeePercent: data.serviceFeePercent,
          serviceFeeAmount: new Prisma.Decimal(data.serviceFeeAmount ?? 0),
          expenseItems: data.expenseItems?.length
            ? {
                create: data.expenseItems.map((it) => ({
                  name: it.name,
                  amount: new Prisma.Decimal(it.amount),
                })),
              }
            : undefined,
        },
      });
    });
    return toDto(created);
  }

  async update(
    userId: string,
    id: string,
    patch: Partial<{
      startProjectDate: string;
      type: 'income' | 'expense';
      amount: number;
      category: string;
      note?: string;
      orderNo: string;
      websiteName: string;
      address?: string;
      telNo?: string;
      customerType: 'individual' | 'company';
      withholdingTaxPercent: number;
      withholdingTaxAmount: number;
      serviceFeePercent: number;
      serviceFeeAmount: number;
      expenseItems?: CreateExpenseItemDto[];
    }>,
  ) {
    const e = await this.prisma.expenseEvent.findFirst({
      where: { id, userId },
    });
    if (!e) throw new NotFoundException('Event not found');

    const data: Prisma.ExpenseEventUpdateInput = {};
    if (patch.startProjectDate)
      data.startProjectDate = startOfDayUTC(patch.startProjectDate);
    if (patch.type)
      data.type =
        patch.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE;
    if (typeof patch.amount === 'number') {
      if (patch.amount <= 0)
        throw new BadRequestException('Amount must be positive');
      data.amount = new Prisma.Decimal(patch.amount);
    }
    if (patch.category !== undefined)
      data.category = patch.category.trim() || 'อื่นๆ';
    if (patch.note !== undefined) data.note = patch.note?.trim() || null;
    if (patch.orderNo !== undefined)
      data.orderNo =
        patch.orderNo?.trim() ||
        `ORD-${DateUtils.mixedDateToDateString(new Date())}`;
    if (patch.websiteName !== undefined)
      data.websiteName = patch.websiteName?.trim() || 'Unknown';
    if (patch.address !== undefined)
      data.address = patch.address?.trim() || null;
    if (patch.telNo !== undefined) data.telNo = patch.telNo?.trim() || null;
    if (patch.customerType !== undefined)
      data.customerType =
        patch.customerType === 'individual'
          ? CustomerType.INDIVIDUAL
          : CustomerType.BUSINESS;
    if (typeof patch.withholdingTaxPercent === 'number') {
      if (patch.withholdingTaxPercent <= 0)
        throw new BadRequestException(
          'Withholding Tax Percent must be positive',
        );
      data.withholdingTaxPercent = patch.withholdingTaxPercent;
    }
    if (typeof patch.withholdingTaxAmount === 'number') {
      if (patch.withholdingTaxAmount <= 0)
        throw new BadRequestException(
          'Withholding Tax Amount must be positive',
        );
      data.withholdingTaxAmount = new Prisma.Decimal(
        patch.withholdingTaxAmount,
      );
    }
    if (typeof patch.serviceFeePercent === 'number') {
      if (patch.serviceFeePercent <= 0)
        throw new BadRequestException('Service Fee Percent must be positive');
      data.serviceFeePercent = patch.serviceFeePercent;
    }
    if (typeof patch.serviceFeeAmount === 'number') {
      if (patch.serviceFeeAmount <= 0)
        throw new BadRequestException('Service Fee Amount must be positive');
      data.serviceFeeAmount = new Prisma.Decimal(patch.serviceFeeAmount);
    }
    if (patch.expenseItems !== undefined) {
      // ลบรายการเดิมทั้งหมด แล้วเพิ่มรายการใหม่ (ถ้ามี)
      data.expenseItems = {
        deleteMany: {},
        create: patch.expenseItems.map((item) => ({
          ...item,
          amount: new Prisma.Decimal(item.amount),
        })),
      };
    }

    const updated = await this.prisma.expenseEvent.update({
      where: { id },
      data,
    });
    return toDto(updated);
  }

  async remove(userId: string, id: string) {
    const e = await this.prisma.expenseEvent.findFirst({
      where: { id, userId },
    });
    if (!e) throw new NotFoundException('Event not found');
    await this.prisma.expenseEvent.delete({ where: { id } });
    return { success: true };
  }

  async summary(userId: string, q: { from?: string; to?: string }) {
    const where: Prisma.ExpenseEventWhereInput = { userId };
    if (q.from && q.to)
      where.startProjectDate = {
        gte: startOfDayUTC(q.from),
        lte: endOfDayUTC(q.to),
      };
    else if (q.from) where.startProjectDate = { gte: startOfDayUTC(q.from) };
    else if (q.to) where.startProjectDate = { lte: endOfDayUTC(q.to) };

    const rows = await this.prisma.expenseEvent.findMany({
      where,
      select: { amount: true, type: true },
    });
    let income = 0,
      expense = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.type === 'INCOME') income += amt;
      else expense += amt;
    }
    return { income, expense, balance: income - expense };
  }
}
