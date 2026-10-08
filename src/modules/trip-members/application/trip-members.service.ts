import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripMemberRepository } from '../domain/trip-member.repository.js';
import { CreateTripMemberDto } from './dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto.js';
import { TripMemberResponseDto } from './dto/trip-member-response.dto.js';

@Injectable()
export class TripMembersService {
  constructor(
    private readonly repository: TripMemberRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripMemberResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
    );

    return {
      data: items.map((item) => TripMemberResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    const member = await this.getOrFail(id);
    await this.access.assertCanRead(member.tripId, user.id);

    return TripMemberResponseDto.from(member);
  }

  async create(
    dto: CreateTripMemberDto,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    // Only the creator passes this check, so `user` is the trip creator: they
    // already own the trip and must not also appear as a member.
    await this.access.assertIsCreator(dto.tripId, user.id);

    if (dto.userId === user.id) {
      throw new ConflictException(
        'The trip creator is already part of the trip and cannot be added as a member',
      );
    }

    return TripMemberResponseDto.from(await this.repository.create({ ...dto }));
  }

  async update(
    id: string,
    dto: UpdateTripMemberDto,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    const member = await this.getOrFail(id);
    await this.access.assertIsCreator(member.tripId, user.id);

    return TripMemberResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const member = await this.getOrFail(id);
    await this.access.assertIsCreator(member.tripId, user.id);
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
