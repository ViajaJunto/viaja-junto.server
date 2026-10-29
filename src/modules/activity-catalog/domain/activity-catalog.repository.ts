import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { ActivityCatalog } from './activity-catalog.entity.js';

/** Discovery filters; every field that is set narrows the result. */
export interface ActivityCatalogFilter {
  /** Case-insensitive text contained in the name. */
  text?: string;
  type?: ActivityCatalog['type'];
  /** Average rating at or above this value. */
  minRating?: number;
  city?: string;
  country?: string;
  /** `name` (default) or best rated first. */
  sort?: 'name' | 'rating';
}

export type CreateActivityCatalogData = Omit<
  ActivityCatalog,
  'id' | 'createdAt'
>;
export type UpdateActivityCatalogData = Partial<CreateActivityCatalogData>;

/**
 * Persistence contract for the ActivityCatalog.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class ActivityCatalogRepository {
  abstract findAll(
    page: PageRequest,
    filter: ActivityCatalogFilter,
  ): Promise<Page<ActivityCatalog>>;
  abstract findById(id: string): Promise<ActivityCatalog | null>;
  abstract create(data: CreateActivityCatalogData): Promise<ActivityCatalog>;
  abstract update(
    id: string,
    data: UpdateActivityCatalogData,
  ): Promise<ActivityCatalog>;
  /** How many trip destinations/activities still use this entry. */
  abstract countTripUsages(id: string): Promise<number>;
  abstract remove(id: string): Promise<void>;
}
