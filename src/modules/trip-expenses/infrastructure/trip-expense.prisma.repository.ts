import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Split } from '../../../shared/expenses/index.js';
import { TripExpense } from '../domain/trip-expense.entity.js';
import {
  CreateTripExpenseData,
  TripExpenseFilter,
  TripExpenseRepository,
  UpdateTripExpenseData,
} from '../domain/trip-expense.repository.js';

const withShares = {
  include: { shares: true },
} satisfies Prisma.TripExpenseDefaultArgs;
type Row = Prisma.TripExpenseGetPayload<typeof withShares>;

/** Rows → the entity, rebuilding the split from the share rows. */
function toEntity(row: Row): TripExpense {
  const shares = [...row.shares].sort((a, b) => a.position - b.position);
  const { shares: _shares, splitType, exchangeRate, ...rest } = row;

  let split: Split;
  if (splitType === 'EQUAL') {
    split = { type: 'equal', participants: shares.map(({ userId }) => userId) };
  } else if (splitType === 'EXACT') {
    split = {
      type: 'exact',
      shares: shares.map(({ userId, amount }) => ({
        participant: userId,
        amount: amount ?? 0,
      })),
    };
  } else {
    split = {
      type: 'proportional',
      weights: shares.map(({ userId, weight }) => ({
        participant: userId,
        weight: Number(weight),
      })),
    };
  }

  return {
    ...rest,
    exchangeRate: exchangeRate === null ? null : Number(exchangeRate),
    split,
  };
}

/** The split as the rows that store it, in listing order. */
function toShareRows(split: Split) {
  switch (split.type) {
    case 'equal':
      return {
        splitType: 'EQUAL' as const,
        rows: split.participants.map((userId, position) => ({
          userId,
          position,
        })),
      };
    case 'exact':
      return {
        splitType: 'EXACT' as const,
        rows: split.shares.map(({ participant, amount }, position) => ({
          userId: participant,
          position,
          amount,
        })),
      };
    case 'proportional':
      return {
        splitType: 'PROPORTIONAL' as const,
        rows: split.weights.map(({ participant, weight }, position) => ({
          userId: participant,
          position,
          weight,
        })),
      };
  }
}

@Injectable()
export class TripExpensePrismaRepository implements TripExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
    filter: TripExpenseFilter,
  ): Promise<Page<TripExpense>> {
    const where: Prisma.TripExpenseWhereInput = {
      trip: accessibleTrips(userId),
      tripId: filter.tripId,
    };

    // One transaction so the page and the total come from the same snapshot.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tripExpense.findMany({
        where,
        skip,
        take,
        orderBy: [
          { spentOn: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        ...withShares,
      }),
      this.prisma.tripExpense.count({ where }),
    ]);

    return { items: rows.map(toEntity), total };
  }

  async findById(id: string): Promise<TripExpense | null> {
    const row = await this.prisma.tripExpense.findUnique({
      where: { id },
      ...withShares,
    });

    return row && toEntity(row);
  }

  async findByTrip(tripId: string): Promise<TripExpense[]> {
    const rows = await this.prisma.tripExpense.findMany({
      where: { tripId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...withShares,
    });

    return rows.map(toEntity);
  }

  async create(data: CreateTripExpenseData): Promise<TripExpense> {
    const { split, ...fields } = data;
    const { splitType, rows } = toShareRows(split);

    const created = await this.prisma.tripExpense.create({
      data: { ...fields, splitType, shares: { create: rows } },
      ...withShares,
    });

    return toEntity(created);
  }

  update(id: string, data: UpdateTripExpenseData): Promise<TripExpense> {
    const { split, ...fields } = data;

    // The shares are replaced together with the expense, or not at all.
    return this.prisma.$transaction(async (tx) => {
      let splitData: Prisma.TripExpenseUncheckedUpdateInput = {};
      if (split) {
        const { splitType, rows } = toShareRows(split);
        await tx.tripExpenseShare.deleteMany({ where: { expenseId: id } });
        splitData = { splitType, shares: { create: rows } };
      }

      return toEntity(
        await tx.tripExpense.update({
          where: { id },
          data: { ...fields, ...splitData },
          ...withShares,
        }),
      );
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripExpense.delete({ where: { id } });
  }

  async findTripCurrency(tripId: string): Promise<string | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { currency: true },
    });

    return trip?.currency ?? null;
  }

  async findTripPeople(tripId: string): Promise<string[]> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        createdBy: true,
        members: { select: { userId: true } },
      },
    });

    return trip
      ? [trip.createdBy, ...trip.members.map(({ userId }) => userId)]
      : [];
  }
}
