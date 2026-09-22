import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripActivityRepository } from '../domain/trip-activity.repository.js';
import { CreateTripActivityDto } from './dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from './dto/update-trip-activity.dto.js';
import { TripActivityResponseDto } from './dto/trip-activity-response.dto.js';

@Injectable()
export class TripActivitiesService {
  constructor(private readonly repository: TripActivityRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TripActivityResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => TripActivityResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<TripActivityResponseDto> {
    return TripActivityResponseDto.from(await this.getOrFail(id));
  }

  async create(dto: CreateTripActivityDto): Promise<TripActivityResponseDto> {
    return TripActivityResponseDto.from(await this.repository.create({ ...dto, status: dto.status ?? 'PENDING' }));
  }

  async update(id: string, dto: UpdateTripActivityDto): Promise<TripActivityResponseDto> {
    await this.getOrFail(id);

    return TripActivityResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`TripActivity with id "${id}" not found`);
    }

    return found;
  }
}
