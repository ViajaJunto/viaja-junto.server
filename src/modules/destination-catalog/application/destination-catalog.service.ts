import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { DestinationCatalogRepository } from '../domain/destination-catalog.repository.js';
import { CreateDestinationCatalogDto } from './dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from './dto/update-destination-catalog.dto.js';
import { DestinationCatalogResponseDto } from './dto/destination-catalog-response.dto.js';

@Injectable()
export class DestinationCatalogService {
  constructor(private readonly repository: DestinationCatalogRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<DestinationCatalogResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => DestinationCatalogResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<DestinationCatalogResponseDto> {
    return DestinationCatalogResponseDto.from(await this.getOrFail(id));
  }

  async create(dto: CreateDestinationCatalogDto): Promise<DestinationCatalogResponseDto> {
    return DestinationCatalogResponseDto.from(await this.repository.create({ ...dto }));
  }

  async update(id: string, dto: UpdateDestinationCatalogDto): Promise<DestinationCatalogResponseDto> {
    await this.getOrFail(id);

    return DestinationCatalogResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`DestinationCatalog with id "${id}" not found`);
    }

    return found;
  }
}
