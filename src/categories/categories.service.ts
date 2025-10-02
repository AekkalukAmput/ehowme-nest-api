import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private toType(t: 'income' | 'expense') {
    return t === 'income' ? ExpenseType.INCOME : ExpenseType.EXPENSE;
  }

  async list(userId: string, type?: 'income' | 'expense') {
    const where: Prisma.ExpenseCategoryWhereInput = { userId, isActive: true };
    if (type) where.type = this.toType(type);
    const rows = await this.prisma.expenseCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows;
  }

  async tree(userId: string, type?: 'income' | 'expense') {
    const flat = await this.list(userId, type);
    // build tree
    const byId = new Map(
      flat.map((c) => [c.id, { ...c, children: [] as any[] }]),
    );
    const roots: any[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.children.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  private async assertSiblingUnique(
    userId: string,
    type: ExpenseType,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ) {
    const exists = await this.prisma.expenseCategory.findFirst({
      where: {
        userId,
        type,
        parentId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (exists)
      throw new BadRequestException(
        'Category name already exists at this level',
      );
  }

  private async assertNoCycle(
    userId: string,
    id: string,
    nextParentId?: string | null,
  ) {
    if (!nextParentId) return;
    if (id === nextParentId)
      throw new BadRequestException('Cannot set parent to itself');
    // climb ancestors
    let cur: string | null | undefined = nextParentId;
    while (cur) {
      if (cur === id)
        throw new BadRequestException(
          'Cannot move category under its descendant',
        );
      const p = await this.prisma.expenseCategory.findFirst({
        where: { id: cur, userId },
        select: { parentId: true },
      });
      cur = p?.parentId ?? null;
    }
  }

  async create(
    userId: string,
    dto: {
      type: 'income' | 'expense';
      name: string;
      parentId?: string;
      sortOrder?: number;
    },
  ) {
    const type = this.toType(dto.type);
    let parent: { id: string; type: ExpenseType } | null = null;
    if (dto.parentId) {
      parent = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.parentId, userId },
        select: { id: true, type: true },
      });
      if (!parent) throw new NotFoundException('Parent not found');
      if (parent.type !== type)
        throw new BadRequestException('Type must match parent');
    }
    await this.assertSiblingUnique(
      userId,
      type,
      dto.parentId ?? null,
      dto.name,
    );

    return this.prisma.expenseCategory.create({
      data: {
        userId,
        type,
        name: dto.name.trim(),
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    patch: {
      name?: string;
      type?: 'income' | 'expense';
      parentId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const cur = await this.prisma.expenseCategory.findFirst({
      where: { id, userId },
    });
    if (!cur) throw new NotFoundException('Category not found');

    const nextType = patch.type ? this.toType(patch.type) : cur.type;
    const nextParentId = patch.hasOwnProperty('parentId')
      ? (patch.parentId ?? null)
      : cur.parentId;

    if (nextParentId) {
      const parent = await this.prisma.expenseCategory.findFirst({
        where: { id: nextParentId, userId },
      });
      if (!parent) throw new NotFoundException('Parent not found');
      if (parent.type !== nextType)
        throw new BadRequestException('Type must match parent');
      await this.assertNoCycle(userId, id, nextParentId);
    }

    if (patch.name) {
      await this.assertSiblingUnique(
        userId,
        nextType,
        nextParentId ?? null,
        patch.name,
        id,
      );
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: patch.name?.trim(),
        type: nextType,
        parentId: nextParentId,
        sortOrder: patch.sortOrder,
        isActive: patch.isActive,
      },
    });
  }

  async remove(userId: string, id: string) {
    // ห้ามลบถ้ามีลูกหรือถูกใช้งาน
    const cat = await this.prisma.expenseCategory.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            children: true,
            expenseEvents: true,
          },
        },
      },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.children > 0)
      throw new BadRequestException('Cannot delete: category has children');
    if (cat._count.expenseEvents > 0)
      throw new BadRequestException('Cannot delete: category in use');

    await this.prisma.expenseCategory.delete({ where: { id } });
    return { success: true };
  }

  // seed ชุดมาตรฐานสำหรับผู้ใช้ (เรียกครั้งเดียวตอนเริ่ม)
  async seedDefaults(userId: string) {
    const hasAny = await this.prisma.expenseCategory.findFirst({
      where: { userId },
    });
    if (hasAny) return { ok: true, skipped: true };

    // helper สร้างโหนด + ลูก
    const create = (
      type: ExpenseType,
      name: string,
      parentId: string | null = null,
      sortOrder = 0,
    ) =>
      this.prisma.expenseCategory.create({
        data: { userId, type, name, parentId, sortOrder },
      });

    // รายรับ
    await create(ExpenseType.INCOME, 'เงินเดือน', null, 0);
    await create(ExpenseType.INCOME, 'อื่นๆ', null, 1);

    // รายจ่าย (ตัวอย่างตามที่ให้)
    const food = await create(
      ExpenseType.EXPENSE,
      'อาหาร/เครื่องดื่ม',
      null,
      0,
    );
    const shop = await create(ExpenseType.EXPENSE, 'ช้อปปิ้ง', null, 1);
    await create(ExpenseType.EXPENSE, 'บิล', null, 2);
    await create(ExpenseType.EXPENSE, 'การเดินทาง', null, 3);

    await create(ExpenseType.EXPENSE, 'ช้อปปิ้ง', shop.id, 0);
    await create(ExpenseType.EXPENSE, 'เสื้อผ้า', shop.id, 1);
    await create(ExpenseType.EXPENSE, 'รองเท้า', shop.id, 2);
    await create(ExpenseType.EXPENSE, 'ของใช้ส่วนตัว', shop.id, 3);
    await create(ExpenseType.EXPENSE, 'แฟชั่น', shop.id, 4);
    await create(ExpenseType.EXPENSE, 'เกม', shop.id, 5);

    const bill = await this.prisma.expenseCategory.findFirst({
      where: { userId, type: ExpenseType.EXPENSE, name: 'บิล' },
    });
    if (bill) {
      await create(ExpenseType.EXPENSE, 'ค่าเช่า', bill.id, 0);
      await create(ExpenseType.EXPENSE, 'ค่าไฟ', bill.id, 1);
    }

    const travel = await this.prisma.expenseCategory.findFirst({
      where: { userId, type: ExpenseType.EXPENSE, name: 'การเดินทาง' },
    });
    if (travel) {
      await create(ExpenseType.EXPENSE, 'ค่าเดินทาง', travel.id, 0);
      await create(ExpenseType.EXPENSE, 'ค่าน้ำมัน', travel.id, 1);
      await create(ExpenseType.EXPENSE, 'ค่าตั๋ว', travel.id, 2);
    }

    return { ok: true };
  }
}
