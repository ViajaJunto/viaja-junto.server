import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { TripEvent } from '../../../shared/events/trip-events.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { payloadFor, recipientsFor } from '../domain/notification-plan.js';
import { NotificationRepository } from '../domain/notification.repository.js';
import {
  MarkedReadResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationRepository) {}

  /**
   * Tells everyone on the trip about a change, except who made it. A trip that
   * no longer exists (it was deleted along with its members) has nobody to tell.
   */
  async notify(event: TripEvent): Promise<void> {
    const people = await this.repository.findTripPeople(event.tripId);
    const recipients = recipientsFor(event, people);

    if (recipients.length === 0) return;

    const payload = payloadFor(
      event,
      await this.repository.findNames(event.tripId, event.actorId),
    );

    await this.repository.createMany(
      recipients.map((userId) => ({
        userId,
        tripId: event.tripId,
        actorId: event.actorId,
        type: event.type,
        payload,
      })),
    );
  }

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
    );

    return {
      data: items.map((item) => NotificationResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async unreadCount(user: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    return { unread: await this.repository.countUnread(user.id) };
  }

  /** Only the owner can mark a notification, and others cannot tell it exists. */
  async markRead(
    id: string,
    user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.markRead(id, user.id);

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    return NotificationResponseDto.from(notification);
  }

  async markAllRead(user: AuthenticatedUser): Promise<MarkedReadResponseDto> {
    return { updated: await this.repository.markAllRead(user.id) };
  }
}
