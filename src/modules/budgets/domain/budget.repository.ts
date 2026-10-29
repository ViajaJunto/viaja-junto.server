import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { PaidExpense, PlannedActivity } from './budget-summary.js';
import { Budget } from './budget.entity.js';

/** The raw facts a budget summary is computed from. */
export interface BudgetSummarySource {
  currency: string;
  totalValue: number | null;
  activities: PlannedActivity[];
  expenses: PaidExpense[];
}

export type CreateBudgetData = Omit<Budget, 'id' | 'createdAt' | 'currency'>;
export type UpdateBudgetData = Partial<CreateBudgetData>;

/**
 * Persistence contract for the Budget.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class BudgetRepository {
  /** Only records belonging to trips the user can see. */
  abstract findAll(page: PageRequest, userId: string): Promise<Page<Budget>>;
  abstract findById(id: string): Promise<Budget | null>;
  abstract create(data: CreateBudgetData): Promise<Budget>;
  abstract update(id: string, data: UpdateBudgetData): Promise<Budget>;
  /** The trip's budget and activities with their cost; null when the trip does not exist. */
  abstract findSummarySource(
    tripId: string,
  ): Promise<BudgetSummarySource | null>;
  abstract remove(id: string): Promise<void>;
}
