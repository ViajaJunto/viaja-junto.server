import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { TripExpense } from './trip-expense.entity.js';

export interface TripExpenseFilter {
  tripId?: string;
}

export type CreateTripExpenseData = Omit<TripExpense, 'id' | 'createdAt'>;
export type UpdateTripExpenseData = Partial<
  Omit<CreateTripExpenseData, 'tripId' | 'createdBy'>
>;

/**
 * Persistence contract for trip expenses.
 *
 * Declared as an abstract class so Nest can use it as a DI token.
 */
export abstract class TripExpenseRepository {
  /** Expenses of the trips the user can see, most recent first. */
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripExpenseFilter,
  ): Promise<Page<TripExpense>>;
  abstract findById(id: string): Promise<TripExpense | null>;
  /** Every expense of a trip, for the summary. */
  abstract findByTrip(tripId: string): Promise<TripExpense[]>;
  abstract create(data: CreateTripExpenseData): Promise<TripExpense>;
  abstract update(
    id: string,
    data: UpdateTripExpenseData,
  ): Promise<TripExpense>;
  abstract remove(id: string): Promise<void>;
  /** The trip's currency, or null when the trip does not exist. */
  abstract findTripCurrency(tripId: string): Promise<string | null>;
  /** The trip's creator and members: the only people an expense can involve. */
  abstract findTripPeople(tripId: string): Promise<string[]>;
}
