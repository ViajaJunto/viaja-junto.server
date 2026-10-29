import type { Prisma } from '@prisma/client';
import { escapeLike } from '../../../shared/database/like.js';
import type { ActivityCatalogFilter } from '../domain/activity-catalog.repository.js';

/**
 * Translates the discovery filters into a Prisma `where`. Filters are
 * combined with AND; the ones that are not set add no condition.
 */
export function buildActivityWhere({
  text,
  type,
  minRating,
  city,
  country,
  destinationId,
}: ActivityCatalogFilter): Prisma.ActivityCatalogWhereInput {
  const conditions: Prisma.ActivityCatalogWhereInput[] = [];

  if (text) {
    conditions.push({
      name: { contains: escapeLike(text), mode: 'insensitive' },
    });
  }
  if (type) {
    conditions.push({ type });
  }
  if (minRating !== undefined) {
    // A null rating never satisfies `gte`, so unrated activities drop out.
    conditions.push({ averageRating: { gte: minRating } });
  }
  if (city) {
    conditions.push({
      city: { equals: escapeLike(city), mode: 'insensitive' },
    });
  }
  if (country) {
    conditions.push({
      country: { equals: escapeLike(country), mode: 'insensitive' },
    });
  }

  if (destinationId) {
    conditions.push({ destinationCatalogId: destinationId });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

/** Best rated first (unrated last), or A to Z; ties fall back to the name and then to the id, so pages never overlap. */
export function buildActivityOrderBy(
  sort: ActivityCatalogFilter['sort'],
): Prisma.ActivityCatalogOrderByWithRelationInput[] {
  return sort === 'rating'
    ? [
        { averageRating: { sort: 'desc', nulls: 'last' } },
        { name: 'asc' },
        { id: 'asc' },
      ]
    : [{ name: 'asc' }, { id: 'asc' }];
}
