import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripDestinationRepository } from '../domain/trip-destination.repository.js';
import { ListTripDestinationsQueryDto } from './dto/list-trip-destinations-query.dto.js';
import { ReorderTripDestinationsDto } from './dto/reorder-trip-destinations.dto.js';
import { CreateTripDestinationDto } from './dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from './dto/update-trip-destination.dto.js';
import { TripDestinationResponseDto } from './dto/trip-destination-response.dto.js';

@Injectable()
export class TripDestinationsService {
  constructor(
    private readonly repository: TripDestinationRepository,
    private readonly access: TripAccessService,
  ) {}

  async findAll(
    query: ListTripDestinationsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripDestinationResponseDto>> {
    if (query.tripId) {
      await this.access.assertCanRead(query.tripId, user.id);
    }
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { tripId: query.tripId },
    );

    return {
      data: items.map((item) => TripDestinationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripDestinationResponseDto> {
    const destination = await this.getOrFail(id);
    await this.access.assertCanRead(destination.tripId, user.id);

    return TripDestinationResponseDto.from(destination);
  }

  async create(
    dto: CreateTripDestinationDto,
    user: AuthenticatedUser,
  ): Promise<TripDestinationResponseDto> {
    await this.access.assertCanEdit(dto.tripId, user.id);

    return TripDestinationResponseDto.from(
      await this.repository.create({ ...dto }),
    );
  }

  async update(
    id: string,
    dto: UpdateTripDestinationDto,
    user: AuthenticatedUser,
  ): Promise<TripDestinationResponseDto> {
    const destination = await this.getOrFail(id);
    await this.access.assertCanEdit(destination.tripId, user.id);

    return TripDestinationResponseDto.from(
      await this.repository.update(id, { ...dto }),
    );
  }

  /**
   * Rewrites the itinerary order of a trip. The ids must be exactly the trip's
   * destinations (no extras, none missing, none repeated), so `order` always
   * ends up contiguous and no destination of another trip can be moved.
   */
  async reorder(
    tripId: string,
    dto: ReorderTripDestinationsDto,
    user: AuthenticatedUser,
  ): Promise<TripDestinationResponseDto[]> {
    await this.access.assertCanEdit(tripId, user.id);

    const current = await this.repository.findByTrip(tripId);
    const expected = new Set(current.map((destination) => destination.id));

    const requested = new Set(dto.destinationIds);

    if (
      dto.destinationIds.length !== expected.size ||
      requested.size !== expected.size ||
      !dto.destinationIds.every((id) => expected.has(id))
    ) {
      throw new UnprocessableEntityException(
        'destinationIds must list every destination of the trip exactly once',
      );
    }

    return (await this.repository.reorder(tripId, dto.destinationIds)).map(
      (item) => TripDestinationResponseDto.from(item),
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const destination = await this.getOrFail(id);
    await this.access.assertCanEdit(destination.tripId, user.id);
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
