import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripActivityRepository } from '../domain/trip-activity.repository.js';
import { CreateTripActivityDto } from './dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from './dto/update-trip-activity.dto.js';
import { TripActivityResponseDto } from './dto/trip-activity-response.dto.js';

@Injectable()
export class TripActivitiesService {
  constructor(
    private readonly repository: TripActivityRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripActivityResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
    );

    return {
      data: items.map((item) => TripActivityResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripActivityResponseDto> {
    const activity = await this.getOrFail(id);
    const tripId = await this.access.tripIdOfDestination(
      activity.tripDestinationId,
    );
    await this.access.assertCanRead(tripId, user.id);

    return TripActivityResponseDto.from(activity);
  }

  async create(
    dto: CreateTripActivityDto,
    user: AuthenticatedUser,
  ): Promise<TripActivityResponseDto> {
    const tripId = await this.access.tripIdOfDestination(dto.tripDestinationId);
    await this.access.assertCanEdit(tripId, user.id);

    return TripActivityResponseDto.from(
      await this.repository.create({ ...dto, status: dto.status ?? 'PENDING' }),
    );
  }

  async update(
    id: string,
    dto: UpdateTripActivityDto,
    user: AuthenticatedUser,
  ): Promise<TripActivityResponseDto> {
    await this.assertCanEditActivity(id, user);

    return TripActivityResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.assertCanEditActivity(id, user);
    await this.repository.remove(id);
  }

  private async assertCanEditActivity(
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const activity = await this.getOrFail(id);
    const tripId = await this.access.tripIdOfDestination(
      activity.tripDestinationId,
    );
    await this.access.assertCanEdit(tripId, user.id);
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`TripActivity with id "${id}" not found`);
    }

    return found;
  }
}
