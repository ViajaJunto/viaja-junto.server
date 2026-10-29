import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { buildDestinationWhere } from './destination-catalog.filters.js';
import { DestinationCatalog } from '../domain/destination-catalog.entity.js';
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
        orderBy: { name: 'asc' },
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

  countTripUsages(id: string): Promise<number> {
    return this.prisma.tripDestination.count({
      where: { destinationCatalogId: id },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.destinationCatalog.delete({ where: { id } });
  }
}
