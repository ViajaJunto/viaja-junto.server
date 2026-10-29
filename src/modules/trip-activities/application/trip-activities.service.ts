import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripEventPublisher } from '../../../shared/events/trip-events.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { validateActivityDateTime } from '../domain/activity-schedule.js';
import { TripActivityRepository } from '../domain/trip-activity.repository.js';
import { ListTripActivitiesQueryDto } from './dto/list-trip-activities-query.dto.js';
import { CreateTripActivityDto } from './dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from './dto/update-trip-activity.dto.js';
import { TripActivityResponseDto } from './dto/trip-activity-response.dto.js';

@Injectable()
export class TripActivitiesService {
  constructor(
    private readonly repository: TripActivityRepository,
    private readonly access: TripAccessService,
    private readonly events: TripEventPublisher,
  ) {}

  async findAll(
    query: ListTripActivitiesQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripActivityResponseDto>> {
    if (query.tripDestinationId) {
      const tripId = await this.access.tripIdOfDestination(
        query.tripDestinationId,
      );
      await this.access.assertCanRead(tripId, user.id);
    }
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { tripDestinationId: query.tripDestinationId },
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
    await this.assertValidDateTime(dto.tripDestinationId, dto.dateTime);

    const created = await this.repository.create({
      ...dto,
      status: dto.status ?? 'PENDING',
    });
    this.events.publish({
      type: 'ACTIVITY_ADDED',
      tripId,
      actorId: user.id,
      subjectId: created.id,
    });

    return TripActivityResponseDto.from(created);
  }

  async update(
    id: string,
    dto: UpdateTripActivityDto,
    user: AuthenticatedUser,
  ): Promise<TripActivityResponseDto> {
    const { activity, tripId } = await this.assertCanEditActivity(id, user);
    await this.assertValidDateTime(
      activity.tripDestinationId,
      dto.dateTime ?? activity.dateTime,
    );

    const updated = await this.repository.update(id, { ...dto });
    this.events.publish({
      type: 'ACTIVITY_UPDATED',
      tripId,
      actorId: user.id,
      subjectId: id,
    });

    return TripActivityResponseDto.from(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const { tripId } = await this.assertCanEditActivity(id, user);
    await this.repository.remove(id);
    this.events.publish({
      type: 'ACTIVITY_REMOVED',
      tripId,
      actorId: user.id,
      subjectId: id,
    });
  }

  private async assertCanEditActivity(id: string, user: AuthenticatedUser) {
    const activity = await this.getOrFail(id);
    const tripId = await this.access.tripIdOfDestination(
      activity.tripDestinationId,
    );
    await this.access.assertCanEdit(tripId, user.id);

    return { activity, tripId };
  }

  /** The activity must happen during the stay at its destination. */
  private async assertValidDateTime(
    tripDestinationId: string,
    dateTime: Date | null | undefined,
  ): Promise<void> {
    const stay =
      (await this.repository.findDestinationStay(tripDestinationId)) ?? {};
    const errors = validateActivityDateTime(dateTime, stay);

    if (errors.length > 0) {
      throw new UnprocessableEntityException(errors);
    }
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`TripActivity with id "${id}" not found`);
    }

    return found;
  }
}
