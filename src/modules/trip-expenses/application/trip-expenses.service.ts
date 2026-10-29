import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExpenseError } from '../../../shared/expenses/index.js';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import type { TripExpense } from '../domain/trip-expense.entity.js';
import {
  assertValidExpense,
  involvedParticipants,
  summarizeTripExpenses,
  type ExpenseInput,
} from '../domain/trip-expense-ledger.js';
import { TripExpenseRepository } from '../domain/trip-expense.repository.js';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto.js';
import { ExpenseSplitDto } from './dto/expense-split.dto.js';
import { ExpenseSummaryResponseDto } from './dto/expense-summary-response.dto.js';
import { ListTripExpensesQueryDto } from './dto/list-trip-expenses-query.dto.js';
import { TripExpenseResponseDto } from './dto/trip-expense-response.dto.js';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto.js';

@Injectable()
export class TripExpensesService {
  constructor(
    private readonly repository: TripExpenseRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: ListTripExpensesQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripExpenseResponseDto>> {
    if (query.tripId) {
      await this.access.assertCanRead(query.tripId, user.id);
    }
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { tripId: query.tripId },
    );

    return {
      data: items.map((item) => TripExpenseResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    const expense = await this.getOrFail(id);
    await this.access.assertCanRead(expense.tripId, user.id);

    return TripExpenseResponseDto.from(expense);
  }

  async create(
    dto: CreateTripExpenseDto,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    await this.access.assertCanEdit(dto.tripId, user.id);
    const tripCurrency = await this.tripCurrency(dto.tripId);

    const input: ExpenseInput = {
      tripId: dto.tripId,
      payerId: dto.payerId,
      amount: dto.amount,
      currency: dto.currency ?? tripCurrency,
      exchangeRate: dto.exchangeRate ?? null,
      description: dto.description ?? null,
      spentOn: dto.spentOn ?? null,
      split: ExpenseSplitDto.toSplit(dto.split),
    };
    await this.assertValid(input, tripCurrency);

    return TripExpenseResponseDto.from(
      await this.repository.create({ ...input, createdBy: user.id }),
    );
  }

  async update(
    id: string,
    dto: UpdateTripExpenseDto,
    user: AuthenticatedUser,
  ): Promise<TripExpenseResponseDto> {
    const current = await this.getOrFail(id);
    await this.access.assertCanEdit(current.tripId, user.id);
    const tripCurrency = await this.tripCurrency(current.tripId);

    // Only what was sent changes; the rest is checked as it already is.
    const changed: ExpenseInput = {
      tripId: current.tripId,
      payerId: dto.payerId ?? current.payerId,
      amount: dto.amount ?? current.amount,
      currency: dto.currency ?? current.currency,
      exchangeRate:
        dto.exchangeRate !== undefined
          ? dto.exchangeRate
          : dto.currency !== undefined
            ? null
            : current.exchangeRate,
      description: dto.description ?? current.description,
      spentOn: dto.spentOn ?? current.spentOn,
      split: dto.split ? ExpenseSplitDto.toSplit(dto.split) : current.split,
    };
    await this.assertValid(changed, tripCurrency);

    return TripExpenseResponseDto.from(
      await this.repository.update(id, {
        payerId: changed.payerId,
        amount: changed.amount,
        currency: changed.currency,
        exchangeRate: changed.exchangeRate,
        description: changed.description,
        spentOn: changed.spentOn,
        split: changed.split,
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const expense = await this.getOrFail(id);
    await this.access.assertCanEdit(expense.tripId, user.id);
    await this.repository.remove(id);
  }

  /** Who owes whom on a trip. Any member can read it. */
  async summarize(
    tripId: string,
    user: AuthenticatedUser,
  ): Promise<ExpenseSummaryResponseDto> {
    await this.access.assertCanRead(tripId, user.id);
    const tripCurrency = await this.tripCurrency(tripId);

    try {
      return summarizeTripExpenses(
        await this.repository.findByTrip(tripId),
        tripCurrency,
      );
    } catch (error) {
      throw this.asHttpError(error);
    }
  }

  /**
   * Everything that must hold to record an expense: the people involved are
   * on the trip, and the amount, currency, rate and split make sense.
   */
  private async assertValid(
    input: ExpenseInput,
    tripCurrency: string,
  ): Promise<void> {
    const people = new Set(await this.repository.findTripPeople(input.tripId));
    const strangers = involvedParticipants(input).filter(
      (participant) => !people.has(participant),
    );

    if (strangers.length > 0) {
      throw new UnprocessableEntityException(
        `Everyone in an expense must be the creator or a member of the trip; not on it: ${strangers.join(', ')}`,
      );
    }

    try {
      assertValidExpense(input, tripCurrency);
    } catch (error) {
      throw this.asHttpError(error);
    }
  }

  private async tripCurrency(tripId: string): Promise<string> {
    const currency = await this.repository.findTripCurrency(tripId);

    if (!currency) {
      throw new NotFoundException(`Trip with id "${tripId}" not found`);
    }

    return currency;
  }

  /** The library's rejections are invalid input: 422 with its message. */
  private asHttpError(error: unknown): unknown {
    return error instanceof ExpenseError
      ? new UnprocessableEntityException(error.message)
      : error;
  }

  private async getOrFail(id: string): Promise<TripExpense> {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`TripExpense with id "${id}" not found`);
    }

    return found;
  }
}
