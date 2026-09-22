import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { User } from './user.entity.js';

export type CreateUserData = Omit<User, 'id' | 'createdAt'>;
export type UpdateUserData = Partial<CreateUserData>;

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
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
  abstract remove(id: string): Promise<void>;
}
