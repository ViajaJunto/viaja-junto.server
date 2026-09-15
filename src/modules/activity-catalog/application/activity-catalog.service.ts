import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityCatalog } from '../domain/activity-catalog.entity.js';
import { ActivityCatalogRepository } from '../domain/activity-catalog.repository.js';
import { CreateActivityCatalogDto } from './dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from './dto/update-activity-catalog.dto.js';

@Injectable()
export class ActivityCatalogService {
  constructor(private readonly repository: ActivityCatalogRepository) {}

  findAll(): Promise<ActivityCatalog[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<ActivityCatalog> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`ActivityCatalog with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateActivityCatalogDto): Promise<ActivityCatalog> {
    return this.repository.create({ ...dto, type: dto.type ?? 'OTHER' });
  }

  async update(id: string, dto: UpdateActivityCatalogDto): Promise<ActivityCatalog> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
