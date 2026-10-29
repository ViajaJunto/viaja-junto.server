import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import {
  buildActivityOrderBy,
  buildActivityWhere,
} from './activity-catalog.filters.js';
import {
  ActivityCatalog,
  ActivityReview,
} from '../domain/activity-catalog.entity.js';
import {
  CreateActivityCatalogData,
  UpdateActivityCatalogData,
  ActivityCatalogFilter,
  ActivityCatalogRepository,
} from '../domain/activity-catalog.repository.js';

@Injectable()
export class ActivityCatalogPrismaRepository implements ActivityCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: ActivityCatalogFilter,
  ): Promise<Page<ActivityCatalog>> {
    const where = buildActivityWhere(filter);

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityCatalog.findMany({
        where,
        skip,
        take,
        orderBy: buildActivityOrderBy(filter.sort),
      }),
      this.prisma.activityCatalog.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<ActivityCatalog | null> {
    return this.prisma.activityCatalog.findUnique({ where: { id } });
  }

  create(data: CreateActivityCatalogData): Promise<ActivityCatalog> {
    return this.prisma.activityCatalog.create({ data });
  }

  update(
    id: string,
    data: UpdateActivityCatalogData,
  ): Promise<ActivityCatalog> {
    return this.prisma.activityCatalog.update({ where: { id }, data });
  }

  async findExistingExternalIds(externalIds: string[]): Promise<string[]> {
    const rows = await this.prisma.activityCatalog.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true },
    });

    return rows.flatMap(({ externalId }) => externalId ?? []);
  }

  async findLatestReviews(
    activityId: string,
    limit: number,
  ): Promise<ActivityReview[]> {
    const reviews = await this.prisma.review.findMany({
      where: { activityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      // The name only: the email of a reviewer is never public.
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    return reviews.map(({ user, ...review }) => ({
      ...review,
      authorName: user.name,
    }));
  }

  countTripUsages(id: string): Promise<number> {
    return this.prisma.tripActivity.count({ where: { activityCatalogId: id } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.activityCatalog.delete({ where: { id } });
  }
}
