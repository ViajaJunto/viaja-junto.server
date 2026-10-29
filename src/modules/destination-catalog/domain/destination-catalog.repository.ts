import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { DestinationCatalog } from './destination-catalog.entity.js';

/** Discovery filters; every field that is set narrows the result. */
export interface DestinationCatalogFilter {
  /** Case-insensitive text contained in the name. */
  text?: string;
  /** Country name (case-insensitive) or ISO code. */
  country?: string;
  category?: NonNullable<DestinationCatalog['category']>;
}

export type CreateDestinationCatalogData = Omit<DestinationCatalog, 'id'>;
export type UpdateDestinationCatalogData =
  Partial<CreateDestinationCatalogData>;

/**
 * Persistence contract for the DestinationCatalog.
 * aggregate.
 *
 * Declared as an abstract class rather than a TypeScript interface: Nest
 * resolves providers by a token that must exist at runtime, and interfaces
 * are erased at compile time.
 */
export abstract class DestinationCatalogRepository {
  abstract findAll(
    page: PageRequest,
    filter: DestinationCatalogFilter,
  ): Promise<Page<DestinationCatalog>>;
  abstract findById(id: string): Promise<DestinationCatalog | null>;
  abstract create(
    data: CreateDestinationCatalogData,
  ): Promise<DestinationCatalog>;
  abstract update(
    id: string,
    data: UpdateDestinationCatalogData,
  ): Promise<DestinationCatalog>;
  /** How many trip destinations/activities still use this entry. */
  abstract countTripUsages(id: string): Promise<number>;
  abstract remove(id: string): Promise<void>;
}
