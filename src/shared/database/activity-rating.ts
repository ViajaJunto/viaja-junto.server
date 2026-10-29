import { Prisma } from '@prisma/client';

/**
 * Ratings are shown with at most two decimals, rounding halves up like the
 * backfill migration does. EPSILON keeps 1.005 (stored as 1.00499…) from
 * rounding down.
 */
export const roundRating = (average: number): number =>
  Math.round((average + Number.EPSILON) * 100) / 100;

/**
 * Locks the catalog activities so that two transactions changing reviews of
 * the same activity run one after the other. Without it each would aggregate
 * a snapshot that misses the other's uncommitted review and the slower write
 * would store a stale average.
 */
export async function lockActivities(
  tx: Prisma.TransactionClient,
  activityIds: string[],
): Promise<void> {
  if (activityIds.length === 0) return;

  // Ordered, so transactions locking several activities cannot deadlock.
  const ordered = [...new Set(activityIds)].sort();

  await tx.$queryRaw`
    SELECT id FROM activity_catalog
    WHERE id IN (${Prisma.join(ordered)})
    ORDER BY id
    FOR UPDATE`;
}

/**
 * Recomputes `average_rating` and `review_count` of the given activities from
 * their reviews. Call it inside the transaction that changed the reviews.
 */
export async function syncActivityRatings(
  tx: Prisma.TransactionClient,
  activityIds: string[],
): Promise<void> {
  for (const activityId of new Set(activityIds)) {
    const { _avg, _count } = await tx.review.aggregate({
      where: { activityId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.activityCatalog.update({
      where: { id: activityId },
      data: {
        averageRating: _avg.rating === null ? null : roundRating(_avg.rating),
        reviewCount: _count._all,
      },
    });
  }
}
