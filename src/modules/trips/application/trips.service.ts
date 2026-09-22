import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripRepository } from '../domain/trip.repository.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripResponseDto } from './dto/trip-response.dto.js';

@Injectable()
export class TripsService {
  constructor(private readonly repository: TripRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TripResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => TripResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<TripResponseDto> {
    return TripResponseDto.from(await this.getOrFail(id));
  }

  async create(dto: CreateTripDto): Promise<TripResponseDto> {
    return TripResponseDto.from(await this.repository.create({ ...dto, status: dto.status ?? 'PLANNING' }));
  }

  async update(id: string, dto: UpdateTripDto): Promise<TripResponseDto> {
    await this.getOrFail(id);

    return TripResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Trip with id "${id}" not found`);
    }

    return found;
  }
}
