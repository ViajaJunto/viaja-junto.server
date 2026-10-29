import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripRepository } from '../domain/trip.repository.js';
import type { TripRole as AccessRole } from '../../trip-access/domain/trip-access.repository.js';
import type { TripRole } from '../domain/trip.entity.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripResponseDto } from './dto/trip-response.dto.js';

/** The trip-access policy calls the creator CREATOR; the API calls it OWNER. */
const toTripRole = (role: AccessRole): TripRole =>
  role === 'CREATOR' ? 'OWNER' : role;

@Injectable()
export class TripsService {
  constructor(
    private readonly repository: TripRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: ListTripsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { status: query.status },
    );

    return {
      data: items.map((item) => TripResponseDto.from(item, item.role)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<TripResponseDto> {
    const role = await this.access.assertCanRead(id, user.id);

    return TripResponseDto.from(await this.getOrFail(id), toTripRole(role));
  }

  async create(
    dto: CreateTripDto,
    user: AuthenticatedUser,
  ): Promise<TripResponseDto> {
    return TripResponseDto.from(
      await this.repository.create({
        ...dto,
        createdBy: user.id,
        status: dto.status ?? 'PLANNING',
      }),
      'OWNER',
    );
  }

  async update(
    id: string,
    dto: UpdateTripDto,
    user: AuthenticatedUser,
  ): Promise<TripResponseDto> {
    await this.access.assertIsCreator(id, user.id);

    return TripResponseDto.from(
      await this.repository.update(id, { ...dto }),
      'OWNER',
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.access.assertIsCreator(id, user.id);
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
