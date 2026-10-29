import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { Budget } from '../domain/budget.entity.js';
import {
  CreateBudgetData,
  UpdateBudgetData,
  BudgetRepository,
} from '../domain/budget.repository.js';

const withCurrency = {
  include: { trip: { select: { currency: true } } },
} satisfies Prisma.BudgetDefaultArgs;

/** The budget carries the currency of its trip; it has no column of its own. */
function toBudget({
  trip,
  ...budget
}: Prisma.BudgetGetPayload<typeof withCurrency>): Budget {
  return { ...budget, currency: trip.currency };
}

@Injectable()
export class BudgetPrismaRepository implements BudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
  ): Promise<Page<Budget>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where: { trip: accessibleTrips(userId) },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        ...withCurrency,
      }),
      this.prisma.budget.count({ where: { trip: accessibleTrips(userId) } }),
    ]);

    return { items: items.map(toBudget), total };
  }

  async findById(id: string): Promise<Budget | null> {
    const found = await this.prisma.budget.findUnique({
      where: { id },
      ...withCurrency,
    });

    return found && toBudget(found);
  }

  async create(data: CreateBudgetData): Promise<Budget> {
    return toBudget(await this.prisma.budget.create({ data, ...withCurrency }));
  }

  async update(id: string, data: UpdateBudgetData): Promise<Budget> {
    return toBudget(
      await this.prisma.budget.update({
        where: { id },
        data,
        ...withCurrency,
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.prisma.budget.delete({ where: { id } });
  }
}
