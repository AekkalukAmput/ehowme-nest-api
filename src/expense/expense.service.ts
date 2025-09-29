import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

function startOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}`);
}
function endOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}`);
}

function toDto(e: any) {
  return {
    id: e.id,
    date: e.date.toISOString(),
    type: e.type === 'INCOME' ? 'income' : 'expense',
    amount: Number(e.amount),
    category: e.category ?? undefined,
    note: e.note ?? undefined,
  } as const;
}

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async list(
    userId: string,
    q: { from?: string; to?: string; type?: 'income' | 'expense' },
  ) {
    const where: Prisma.ExpenseEventWhereInput = { userId };
    if (q.from && q.to) {
      where.date = { gte: startOfDayUTC(q.from), lte: endOfDayUTC(q.to) };
    } else if (q.from) {
      where.date = { gte: startOfDayUTC(q.from) };
    } else if (q.to) {
      where.date = { lte: endOfDayUTC(q.to) };
    }
    if (q.type)
      where.type =
        q.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE;

    const rows = await this.prisma.expenseEvent.findMany({
      where,
      orderBy: { date: 'desc' },
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
      date: string;
      type: 'income' | 'expense';
      amount: number;
      category?: string;
      note?: string;
    },
  ) {
    if (data.amount <= 0)
      throw new BadRequestException('Amount must be positive');
    const created = await this.prisma.expenseEvent.create({
      data: {
        userId,
        date: startOfDayUTC(data.date),
        type: data.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE,
        amount: new Prisma.Decimal(data.amount),
        category: data.category?.trim() || null,
        note: data.note?.trim() || null,
      },
    });
    return toDto(created);
  }

  async update(
    userId: string,
    id: string,
    patch: Partial<{
      date: string;
      type: 'income' | 'expense';
      amount: number;
      category?: string;
      note?: string;
    }>,
  ) {
    const e = await this.prisma.expenseEvent.findFirst({
      where: { id, userId },
    });
    if (!e) throw new NotFoundException('Event not found');

    const data: Prisma.ExpenseEventUpdateInput = {};
    if (patch.date) data.date = startOfDayUTC(patch.date);
    if (patch.type)
      data.type =
        patch.type === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE;
    if (typeof patch.amount === 'number') {
      if (patch.amount <= 0)
        throw new BadRequestException('Amount must be positive');
      data.amount = new Prisma.Decimal(patch.amount);
    }
    if (patch.category !== undefined)
      data.category = patch.category?.trim() || null;
    if (patch.note !== undefined) data.note = patch.note?.trim() || null;

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
      where.date = { gte: startOfDayUTC(q.from), lte: endOfDayUTC(q.to) };
    else if (q.from) where.date = { gte: startOfDayUTC(q.from) };
    else if (q.to) where.date = { lte: endOfDayUTC(q.to) };

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
