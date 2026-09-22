import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { Review } from './review.entity.js';

export type CreateReviewData = Omit<Review, 'id' | 'createdAt'>;
export type UpdateReviewData = Partial<CreateReviewData>;

/**
 * Persistence contract for the Review.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class ReviewRepository {
  abstract findAll(page: PageRequest): Promise<Page<Review>>;
  abstract findById(id: string): Promise<Review | null>;
  abstract create(data: CreateReviewData): Promise<Review>;
  abstract update(id: string, data: UpdateReviewData): Promise<Review>;
  abstract remove(id: string): Promise<void>;
}
