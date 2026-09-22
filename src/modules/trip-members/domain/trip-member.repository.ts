import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { TripMember } from './trip-member.entity.js';

export type CreateTripMemberData = Omit<TripMember, 'id' | 'joinedAt'>;
export type UpdateTripMemberData = Partial<CreateTripMemberData>;

/**
 * Persistence contract for the TripMember.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class TripMemberRepository {
  abstract findAll(page: PageRequest): Promise<Page<TripMember>>;
  abstract findById(id: string): Promise<TripMember | null>;
  abstract create(data: CreateTripMemberData): Promise<TripMember>;
  abstract update(id: string, data: UpdateTripMemberData): Promise<TripMember>;
  abstract remove(id: string): Promise<void>;
}
