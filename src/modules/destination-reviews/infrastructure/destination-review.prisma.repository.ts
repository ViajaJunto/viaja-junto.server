import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  lockDestinations,
  syncDestinationRatings,
} from '../../../shared/database/destination-rating.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { DestinationReview } from '../domain/destination-review.entity.js';
import {
  CreateDestinationReviewData,
  DestinationReviewFilter,
  DestinationReviewRepository,
  UpdateDestinationReviewData,
} from '../domain/destination-review.repository.js';

@Injectable()
export class DestinationReviewPrismaRepository implements DestinationReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: DestinationReviewFilter,
  ): Promise<Page<DestinationReview>> {
    const where = { destinationId: filter.destinationId };

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.destinationReview.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.destinationReview.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<DestinationReview | null> {
    return this.prisma.destinationReview.findUnique({ where: { id } });
  }

  /**
   * Writing a review and refreshing the rating of its destination is one
   * transaction, holding a lock on the destination, so the average and the
   * count can never disagree with the reviews (also under concurrent writes).
   */
  create(data: CreateDestinationReviewData): Promise<DestinationReview> {
    return this.prisma.$transaction(async (tx) => {
      await lockDestinations(tx, [data.destinationId]);
      const created = await tx.destinationReview.create({ data });
      await syncDestinationRatings(tx, [created.destinationId]);

      return created;
    });
  }

  update(
    id: string,
    data: UpdateDestinationReviewData,
  ): Promise<DestinationReview> {
    return this.prisma.$transaction(async (tx) => {
      const { destinationId } = await tx.destinationReview.findUniqueOrThrow({
        where: { id },
        select: { destinationId: true },
      });
      await lockDestinations(tx, [destinationId]);
      const updated = await tx.destinationReview.update({
        where: { id },
        data,
      });
      await syncDestinationRatings(tx, [destinationId]);

      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { destinationId } = await tx.destinationReview.findUniqueOrThrow({
        where: { id },
        select: { destinationId: true },
      });
      await lockDestinations(tx, [destinationId]);
      await tx.destinationReview.delete({ where: { id } });
      await syncDestinationRatings(tx, [destinationId]);
    });
  }

  async destinationExists(destinationId: string): Promise<boolean> {
    return (
      (await this.prisma.destinationCatalog.count({
        where: { id: destinationId },
      })) > 0
    );
  }

  async hasCompletedTripTo(
    userId: string,
    destinationId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.tripDestination.count({
        where: {
          destinationCatalogId: destinationId,
          trip: { AND: [accessibleTrips(userId), { status: 'COMPLETED' }] },
        },
      })) > 0
    );
  }
}
