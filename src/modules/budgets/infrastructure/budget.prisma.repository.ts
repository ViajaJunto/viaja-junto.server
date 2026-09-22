import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { Budget } from '../domain/budget.entity.js';
import {
  CreateBudgetData,
  UpdateBudgetData,
  BudgetRepository,
} from '../domain/budget.repository.js';

@Injectable()
export class BudgetPrismaRepository implements BudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<Budget>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.budget.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<Budget | null> {
    return this.prisma.budget.findUnique({ where: { id } });
  }

  create(data: CreateBudgetData): Promise<Budget> {
    return this.prisma.budget.create({ data });
  }

  update(id: string, data: UpdateBudgetData): Promise<Budget> {
    return this.prisma.budget.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.budget.delete({ where: { id } });
  }
}
