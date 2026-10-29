import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { TripRange } from './destination-dates.js';
import { TripDestination } from './trip-destination.entity.js';

export interface TripDestinationFilter {
  tripId?: string;
}

export type CreateTripDestinationData = Omit<TripDestination, 'id'>;
export type UpdateTripDestinationData = Partial<CreateTripDestinationData>;

/**
 * Persistence contract for the TripDestination.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class TripDestinationRepository {
  /** Only records belonging to trips the user can see. */
  abstract findAll(
    page: PageRequest,
    userId: string,
    filter: TripDestinationFilter,
  ): Promise<Page<TripDestination>>;
  abstract findById(id: string): Promise<TripDestination | null>;
  abstract create(data: CreateTripDestinationData): Promise<TripDestination>;
  abstract update(
    id: string,
    data: UpdateTripDestinationData,
  ): Promise<TripDestination>;
  /** The dates of a trip, or null when it does not exist. */
  abstract findTripDates(tripId: string): Promise<TripRange | null>;
  /** Every destination of a trip, in itinerary order. */
  abstract findByTrip(tripId: string): Promise<TripDestination[]>;
  /**
   * Gives the trip's destinations the positions 0..n-1 in the order of
   * `orderedIds`, atomically, and returns them in that order.
   */
  abstract reorder(
    tripId: string,
    orderedIds: string[],
  ): Promise<TripDestination[]>;
  abstract remove(id: string): Promise<void>;
}
