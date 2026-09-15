import { Injectable } from '@nestjs/common';
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

  findAll(): Promise<DestinationCatalog[]> {
    return this.prisma.destinationCatalog.findMany();
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
