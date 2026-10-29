import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { User } from './user.entity.js';
import type { VisitedPlace } from './visited-countries.js';

/** The role is never set through the API: new accounts start as USER. */
export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'role'>;
export type UpdateUserData = Partial<CreateUserData>;
/** An account as known to Google: the Google id is always present. */
export type GoogleUserData = Omit<CreateUserData, 'googleId'> & {
  googleId: string;
};

/**
 * Persistence contract for the User.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class UserRepository {
  abstract findAll(page: PageRequest): Promise<Page<User>>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByGoogleId(googleId: string): Promise<User | null>;
  /** Destinations of the user's completed trips (as creator or member). */
  abstract findVisitedPlaces(userId: string): Promise<VisitedPlace[]>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract remove(id: string): Promise<void>;
}
