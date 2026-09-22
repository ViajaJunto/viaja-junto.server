import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { DestinationCatalog } from '../domain/destination-catalog.entity.js';
import {
  CreateDestinationCatalogData,
  UpdateDestinationCatalogData,
  DestinationCatalogRepository,
} from '../domain/destination-catalog.repository.js';

@Injectable()
export class DestinationCatalogPrismaRepository implements DestinationCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<DestinationCatalog>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.destinationCatalog.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.destinationCatalog.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<DestinationCatalog | null> {
    return this.prisma.destinationCatalog.findUnique({ where: { id } });
  }

  create(data: CreateDestinationCatalogData): Promise<DestinationCatalog> {
    return this.prisma.destinationCatalog.create({ data });
  }

  update(id: string, data: UpdateDestinationCatalogData): Promise<DestinationCatalog> {
    return this.prisma.destinationCatalog.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.destinationCatalog.delete({ where: { id } });
  }
}
