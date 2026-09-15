import { Injectable } from '@nestjs/common';
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

  findAll(): Promise<Budget[]> {
    return this.prisma.budget.findMany();
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
