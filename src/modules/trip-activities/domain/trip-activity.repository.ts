import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { TripActivity } from './trip-activity.entity.js';

export type CreateTripActivityData = Omit<TripActivity, 'id'>;
export type UpdateTripActivityData = Partial<CreateTripActivityData>;

/**
 * Persistence contract for the TripActivity.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class TripActivityRepository {
  abstract findAll(page: PageRequest): Promise<Page<TripActivity>>;
  abstract findById(id: string): Promise<TripActivity | null>;
  abstract create(data: CreateTripActivityData): Promise<TripActivity>;
  abstract update(
    id: string,
    data: UpdateTripActivityData,
  ): Promise<TripActivity>;
  abstract remove(id: string): Promise<void>;
}
