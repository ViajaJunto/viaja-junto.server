import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { ActivityCatalog } from './activity-catalog.entity.js';

export type CreateActivityCatalogData = Omit<ActivityCatalog, 'id' | 'createdAt'>;
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
  abstract findAll(page: PageRequest): Promise<Page<ActivityCatalog>>;
  abstract findById(id: string): Promise<ActivityCatalog | null>;
  abstract create(data: CreateActivityCatalogData): Promise<ActivityCatalog>;
  abstract update(id: string, data: UpdateActivityCatalogData): Promise<ActivityCatalog>;
  abstract remove(id: string): Promise<void>;
}
