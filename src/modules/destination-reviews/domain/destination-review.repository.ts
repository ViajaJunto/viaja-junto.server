import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { DestinationReview } from './destination-review.entity.js';

export interface DestinationReviewFilter {
  destinationId?: string;
}

export type CreateDestinationReviewData = Omit<
  DestinationReview,
  'id' | 'createdAt'
>;
export type UpdateDestinationReviewData = Partial<
  Pick<CreateDestinationReviewData, 'rating' | 'comment'>
>;

/**
 * Persistence contract for destination reviews.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class DestinationReviewRepository {
  /** Newest first. */
  abstract findAll(
    page: PageRequest,
    filter: DestinationReviewFilter,
  ): Promise<Page<DestinationReview>>;
  abstract findById(id: string): Promise<DestinationReview | null>;
  abstract create(
    data: CreateDestinationReviewData,
  ): Promise<DestinationReview>;
  abstract update(
    id: string,
    data: UpdateDestinationReviewData,
  ): Promise<DestinationReview>;
  abstract remove(id: string): Promise<void>;
  abstract destinationExists(destinationId: string): Promise<boolean>;
  /**
   * Whether the user created or joined a COMPLETED trip that has this
   * destination in its itinerary (BR05: only who travelled can review).
   */
  abstract hasCompletedTripTo(
    userId: string,
    destinationId: string,
  ): Promise<boolean>;
}
