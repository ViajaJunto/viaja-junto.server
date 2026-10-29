import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { escapeLike } from '../../../shared/database/like.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { buildDestinationWhere } from './destination-catalog.filters.js';
import {
  DestinationCatalog,
  DestinationReviewSummary,
} from '../domain/destination-catalog.entity.js';
import {
  CreateDestinationCatalogData,
  UpdateDestinationCatalogData,
  DestinationCatalogFilter,
  DestinationCatalogRepository,
} from '../domain/destination-catalog.repository.js';

@Injectable()
export class DestinationCatalogPrismaRepository implements DestinationCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    filter: DestinationCatalogFilter,
  ): Promise<Page<DestinationCatalog>> {
    const where = buildDestinationWhere(filter);

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.destinationCatalog.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.destinationCatalog.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<DestinationCatalog | null> {
    return this.prisma.destinationCatalog.findUnique({ where: { id } });
  }

  create(data: CreateDestinationCatalogData): Promise<DestinationCatalog> {
    return this.prisma.destinationCatalog.create({ data });
  }

  update(
    id: string,
    data: UpdateDestinationCatalogData,
  ): Promise<DestinationCatalog> {
    return this.prisma.destinationCatalog.update({ where: { id }, data });
  }

  async findExistingExternalIds(externalIds: string[]): Promise<string[]> {
    const rows = await this.prisma.destinationCatalog.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true },
    });

    return rows.flatMap(({ externalId }) => externalId ?? []);
  }

  findTopRated(limit: number): Promise<DestinationCatalog[]> {
    return this.prisma.destinationCatalog.findMany({
      where: { reviewCount: { gt: 0 } },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' },
        { name: 'asc' },
        { id: 'asc' },
      ],
      take: limit,
    });
  }

  async findIdByCity(city: string, country?: string): Promise<string | null> {
    const found = await this.prisma.destinationCatalog.findFirst({
      where: {
        name: { equals: escapeLike(city), mode: 'insensitive' },
        // A destination without a country matches any; so does a place without one.
        ...(country
          ? {
              OR: [
                { country: null },
                {
                  country: { equals: escapeLike(country), mode: 'insensitive' },
                },
              ],
            }
          : {}),
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    return found?.id ?? null;
  }

  async findLatestReviews(
    destinationId: string,
    limit: number,
  ): Promise<DestinationReviewSummary[]> {
    const reviews = await this.prisma.destinationReview.findMany({
      where: { destinationId },
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
    return this.prisma.tripDestination.count({
      where: { destinationCatalogId: id },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.destinationCatalog.delete({ where: { id } });
  }
}
