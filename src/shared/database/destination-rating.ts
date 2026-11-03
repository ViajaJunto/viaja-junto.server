import { Prisma } from '@prisma/client';
import { roundRating } from './activity-rating.js';

/**
 * Locks the catalog destinations so that two transactions changing reviews of
 * the same destination run one after the other (see `lockActivities`). Rows
 * are locked in `ORDER BY id`, so no two transactions can deadlock.
 */
export async function lockDestinations(
  tx: Prisma.TransactionClient,
  destinationIds: string[],
): Promise<void> {
  if (destinationIds.length === 0) return;

  await tx.$queryRaw`
    SELECT id FROM destination_catalog
    WHERE id IN (${Prisma.join([...new Set(destinationIds)])})
    ORDER BY id
    FOR UPDATE`;
}

/**
 * Recomputes `average_rating` and `review_count` of the given destinations
 * from their own reviews. Call it inside the transaction that changed them.
 */
export async function syncDestinationRatings(
  tx: Prisma.TransactionClient,
  destinationIds: string[],
): Promise<void> {
  for (const destinationId of new Set(destinationIds)) {
    const { _avg, _count } = await tx.destinationReview.aggregate({
      where: { destinationId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.destinationCatalog.update({
      where: { id: destinationId },
      data: {
        averageRating: _avg.rating === null ? null : roundRating(_avg.rating),
        reviewCount: _count._all,
      },
    });
  }
}
