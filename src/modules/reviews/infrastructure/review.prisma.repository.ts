import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  lockActivities,
  syncActivityRatings,
} from '../../../shared/database/activity-rating.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { Review } from '../domain/review.entity.js';
import {
  CreateReviewData,
  UpdateReviewData,
  ReviewFilter,
  ReviewRepository,
} from '../domain/review.repository.js';

@Injectable()
export class ReviewPrismaRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: ReviewFilter,
  ): Promise<Page<Review>> {
    const where = { activityId: filter.activityId };

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  /**
   * Writing a review and refreshing the rating of its activity is one
   * transaction, holding a lock on the activity, so the average and the count
   * can never disagree with the reviews (also under concurrent writes).
   */
  create(data: CreateReviewData): Promise<Review> {
    return this.prisma.$transaction(async (tx) => {
      await lockActivities(tx, [data.activityId]);
      const created = await tx.review.create({ data });
      await syncActivityRatings(tx, [created.activityId]);

      return created;
    });
  }

  update(id: string, data: UpdateReviewData): Promise<Review> {
    return this.prisma.$transaction(async (tx) => {
      const { activityId } = await tx.review.findUniqueOrThrow({
        where: { id },
        select: { activityId: true },
      });
      await lockActivities(tx, [activityId]);
      const updated = await tx.review.update({ where: { id }, data });
      await syncActivityRatings(tx, [activityId]);

      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { activityId } = await tx.review.findUniqueOrThrow({
        where: { id },
        select: { activityId: true },
      });
      await lockActivities(tx, [activityId]);
      await tx.review.delete({ where: { id } });
      await syncActivityRatings(tx, [activityId]);
    });
  }
}
