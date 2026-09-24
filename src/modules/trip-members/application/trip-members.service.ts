import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripMemberRepository } from '../domain/trip-member.repository.js';
import { CreateTripMemberDto } from './dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto.js';
import { TripMemberResponseDto } from './dto/trip-member-response.dto.js';

@Injectable()
export class TripMembersService {
  constructor(private readonly repository: TripMemberRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TripMemberResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => TripMemberResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<TripMemberResponseDto> {
    return TripMemberResponseDto.from(await this.getOrFail(id));
  }

  async create(dto: CreateTripMemberDto): Promise<TripMemberResponseDto> {
    return TripMemberResponseDto.from(await this.repository.create({ ...dto }));
  }

  async update(
    id: string,
    dto: UpdateTripMemberDto,
  ): Promise<TripMemberResponseDto> {
    await this.getOrFail(id);

    return TripMemberResponseDto.from(
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
      throw new NotFoundException(`TripMember with id "${id}" not found`);
    }

    return found;
  }
}
