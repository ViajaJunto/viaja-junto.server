import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { TripDestination } from './trip-destination.entity.js';

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
  abstract findAll(page: PageRequest): Promise<Page<TripDestination>>;
  abstract findById(id: string): Promise<TripDestination | null>;
  abstract create(data: CreateTripDestinationData): Promise<TripDestination>;
  abstract update(id: string, data: UpdateTripDestinationData): Promise<TripDestination>;
  abstract remove(id: string): Promise<void>;
}
