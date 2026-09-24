import { ApiProperty } from '@nestjs/swagger';
import type { TripActivity } from '../../domain/trip-activity.entity.js';

/**
 * Response body for a planned activity.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class TripActivityResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({
    description: 'Itinerary stop.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  tripDestinationId!: string;

  @ApiProperty({
    description: 'Catalog activity.',
    format: 'uuid',
    example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41',
  })
  activityCatalogId!: string;

  @ApiProperty({
    description: 'Scheduled start.',
    type: String,
    format: 'date-time',
    example: '2026-07-04T10:30:00.000Z',
    nullable: true,
  })
  dateTime!: Date | null;

  @ApiProperty({
    type: Number,
    description: 'Estimated duration in minutes.',
    example: 180,
    nullable: true,
  })
  durationMinutes!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Estimated cost per person.',
    example: 22.5,
    nullable: true,
  })
  expectedCost!: number | null;

  @ApiProperty({
    description: 'Booking status.',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED'],
    example: 'PENDING',
  })
  status!: 'PENDING' | 'CONFIRMED' | 'COMPLETED';

  static from(entity: TripActivity): TripActivityResponseDto {
    return {
      id: entity.id,
      tripDestinationId: entity.tripDestinationId,
      activityCatalogId: entity.activityCatalogId,
      dateTime: entity.dateTime ?? null,
      durationMinutes: entity.durationMinutes ?? null,
      expectedCost: entity.expectedCost ?? null,
      status: entity.status,
    };
  }
}
