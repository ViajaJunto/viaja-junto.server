import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { Budget } from './budget.entity.js';

export type CreateBudgetData = Omit<Budget, 'id' | 'createdAt'>;
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
  abstract findAll(page: PageRequest): Promise<Page<Budget>>;
  abstract findById(id: string): Promise<Budget | null>;
  abstract create(data: CreateBudgetData): Promise<Budget>;
  abstract update(id: string, data: UpdateBudgetData): Promise<Budget>;
  abstract remove(id: string): Promise<void>;
}
