import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { buildDestinationWhere } from './destination-catalog.filters.js';
import {
  DestinationCatalog,
  RatedDestination,
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

  async findTopRated(limit: number): Promise<RatedDestination[]> {
    // An activity belongs to a destination when it is in a city of that name
    // (and in that country, when both sides say which). The rating is the
    // mean of the activities' averages weighted by their review counts, i.e.
    // the plain mean of every review given to activities there.
    const ranked = await this.prisma.$queryRaw<
      { id: string; rating: number; reviewCount: number }[]
    >`
      SELECT d.id,
             ROUND((SUM(a.average_rating * a.review_count)
                    / SUM(a.review_count))::numeric, 2)::float AS rating,
             SUM(a.review_count)::int AS "reviewCount"
      FROM destination_catalog d
      JOIN activity_catalog a
        ON LOWER(BTRIM(a.city)) = LOWER(BTRIM(d.name))
       AND (d.country IS NULL OR a.country IS NULL
            OR LOWER(BTRIM(a.country)) = LOWER(BTRIM(d.country)))
      WHERE a.review_count > 0
      GROUP BY d.id
      ORDER BY rating DESC, "reviewCount" DESC, d.name ASC, d.id ASC
      LIMIT ${limit}`;

    if (ranked.length === 0) {
      return [];
    }

    const destinations = new Map(
      (
        await this.prisma.destinationCatalog.findMany({
          where: { id: { in: ranked.map(({ id }) => id) } },
        })
      ).map((destination) => [destination.id, destination]),
    );

    return ranked.flatMap(({ id, rating, reviewCount }) => {
      const destination = destinations.get(id);

      return destination ? [{ ...destination, rating, reviewCount }] : [];
    });
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
