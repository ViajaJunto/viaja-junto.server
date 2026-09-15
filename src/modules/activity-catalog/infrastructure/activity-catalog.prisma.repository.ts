import { Injectable } from '@nestjs/common';
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

  findAll(): Promise<ActivityCatalog[]> {
    return this.prisma.activityCatalog.findMany();
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
