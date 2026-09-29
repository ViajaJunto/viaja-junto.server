import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { ActivityCatalogRepository } from '../domain/activity-catalog.repository.js';
import { CreateActivityCatalogDto } from './dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from './dto/update-activity-catalog.dto.js';
import { ActivityCatalogResponseDto } from './dto/activity-catalog-response.dto.js';

@Injectable()
export class ActivityCatalogService {
  constructor(private readonly repository: ActivityCatalogRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ActivityCatalogResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => ActivityCatalogResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<ActivityCatalogResponseDto> {
    return ActivityCatalogResponseDto.from(await this.getOrFail(id));
  }

  async create(
    dto: CreateActivityCatalogDto,
  ): Promise<ActivityCatalogResponseDto> {
    return ActivityCatalogResponseDto.from(
      await this.repository.create({ ...dto, type: dto.type ?? 'OTHER' }),
    );
  }

  async update(
    id: string,
    dto: UpdateActivityCatalogDto,
  ): Promise<ActivityCatalogResponseDto> {
    await this.getOrFail(id);

    return ActivityCatalogResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`ActivityCatalog with id "${id}" not found`);
    }

    return found;
  }
}
