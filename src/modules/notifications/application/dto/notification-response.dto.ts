import { ApiProperty } from '@nestjs/swagger';
import { TRIP_EVENT_TYPES } from '../../../../shared/events/trip-events.js';
import type { TripEventType } from '../../../../shared/events/trip-events.js';
import type {
  Notification,
  NotificationPayload,
} from '../../domain/notification.entity.js';

/** Something that happened on one of the user's trips. */
export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'The trip it happened on.' })
  tripId!: string;

  @ApiProperty({
    enum: TRIP_EVENT_TYPES,
    example: 'DESTINATION_ADDED',
    description: 'What happened.',
  })
  type!: TripEventType;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Who did it; null if they deleted their account.',
  })
  actorId!: string | null;

  @ApiProperty({
    description:
      'What the client needs to say what happened: `tripName`, `actorName`, the `subjectId` that changed and, depending on the type, details such as `permission`, `from`/`to` or `action`.',
    type: 'object',
    additionalProperties: true,
    example: {
      tripName: 'Eurotrip 2026',
      actorName: 'Ana',
      subjectId: '5b0c7c1e-2f4a-4e0b-9a55-6d2f1c8e7a10',
    },
  })
  payload!: NotificationPayload;

  @ApiProperty({ description: 'Whether the user has read it.' })
  read!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      type: entity.type,
      actorId: entity.actorId,
      payload: entity.payload,
      read: entity.readAt !== null,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
    };
  }
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  unread!: number;
}

export class MarkedReadResponseDto {
  @ApiProperty({
    description: 'How many notifications were unread.',
    example: 3,
  })
  updated!: number;
}
