import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { ActivityCatalog } from '../domain/activity-catalog.entity.js';
import {
  CreateActivityCatalogData,
  UpdateActivityCatalogData,
  ActivityCatalogRepository,
} from '../domain/activity-catalog.repository.js';

@Injectable()
export class ActivityCatalogPrismaRepository implements ActivityCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<ActivityCatalog>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityCatalog.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.activityCatalog.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<ActivityCatalog | null> {
    return this.prisma.activityCatalog.findUnique({ where: { id } });
  }

  create(data: CreateActivityCatalogData): Promise<ActivityCatalog> {
    return this.prisma.activityCatalog.create({ data });
  }

  update(id: string, data: UpdateActivityCatalogData): Promise<ActivityCatalog> {
    return this.prisma.activityCatalog.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.activityCatalog.delete({ where: { id } });
  }
}
