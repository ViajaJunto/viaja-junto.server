import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripDestinationRepository } from '../domain/trip-destination.repository.js';
import { CreateTripDestinationDto } from './dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from './dto/update-trip-destination.dto.js';
import { TripDestinationResponseDto } from './dto/trip-destination-response.dto.js';

@Injectable()
export class TripDestinationsService {
  constructor(private readonly repository: TripDestinationRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TripDestinationResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => TripDestinationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<TripDestinationResponseDto> {
    return TripDestinationResponseDto.from(await this.getOrFail(id));
  }

  async create(
    dto: CreateTripDestinationDto,
  ): Promise<TripDestinationResponseDto> {
    return TripDestinationResponseDto.from(
      await this.repository.create({ ...dto }),
    );
  }

  async update(
    id: string,
    dto: UpdateTripDestinationDto,
  ): Promise<TripDestinationResponseDto> {
    await this.getOrFail(id);

    return TripDestinationResponseDto.from(
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
      throw new NotFoundException(`TripDestination with id "${id}" not found`);
    }

    return found;
  }
}
