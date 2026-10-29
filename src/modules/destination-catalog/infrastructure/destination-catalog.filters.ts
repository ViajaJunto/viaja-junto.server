import type { Prisma } from '@prisma/client';
import { escapeLike } from '../../../shared/database/like.js';
import type { DestinationCatalogFilter } from '../domain/destination-catalog.repository.js';

/**
 * Translates the discovery filters into a Prisma `where`. Filters are
 * combined with AND; the ones that are not set add no condition.
 */
export function buildDestinationWhere({
  text,
  country,
  category,
}: DestinationCatalogFilter): Prisma.DestinationCatalogWhereInput {
  const conditions: Prisma.DestinationCatalogWhereInput[] = [];

  if (text) {
    conditions.push({
      name: { contains: escapeLike(text), mode: 'insensitive' },
    });
  }
  if (country) {
    conditions.push({
      OR: [
        { country: { equals: escapeLike(country), mode: 'insensitive' } },
        { countryCode: { equals: escapeLike(country), mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    conditions.push({ category });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
