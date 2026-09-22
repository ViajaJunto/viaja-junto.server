import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { Trip } from './trip.entity.js';

export type CreateTripData = Omit<Trip, 'id' | 'createdAt'>;
export type UpdateTripData = Partial<CreateTripData>;

/**
 * Persistence contract for the Trip.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class TripRepository {
  abstract findAll(page: PageRequest): Promise<Page<Trip>>;
  abstract findById(id: string): Promise<Trip | null>;
  abstract create(data: CreateTripData): Promise<Trip>;
  abstract update(id: string, data: UpdateTripData): Promise<Trip>;
  abstract remove(id: string): Promise<void>;
}
