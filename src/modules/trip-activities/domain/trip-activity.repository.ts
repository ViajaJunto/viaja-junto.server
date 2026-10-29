import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { DestinationStay } from './activity-schedule.js';
import { TripActivity } from './trip-activity.entity.js';

export interface TripActivityFilter {
  tripDestinationId?: string;
}

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
  /** Only records belonging to trips the user can see. */
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripActivityFilter,
  ): Promise<Page<TripActivity>>;
  abstract findById(id: string): Promise<TripActivity | null>;
  abstract create(data: CreateTripActivityData): Promise<TripActivity>;
  abstract update(
    id: string,
    data: UpdateTripActivityData,
  ): Promise<TripActivity>;
  /** The stay of a trip destination, or null when it does not exist. */
  abstract findDestinationStay(
    tripDestinationId: string,
  ): Promise<DestinationStay | null>;
  abstract remove(id: string): Promise<void>;
}
