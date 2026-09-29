import { ApiProperty } from '@nestjs/swagger';
import type { TripMember } from '../../domain/trip-member.entity.js';

/**
 * Response body for a trip member.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class TripMemberResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({
    description: 'Trip this membership belongs to.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  tripId!: string;

  @ApiProperty({
    description: 'Member user.',
    format: 'uuid',
    example: '9c3d1b7a-2e55-4f10-8a6b-1d7c2f9e4b33',
  })
  userId!: string;

  @ApiProperty({
    description: 'Permission level.',
    enum: ['EDITOR', 'VIEWER'],
    example: 'EDITOR',
  })
  permission!: 'EDITOR' | 'VIEWER';

  @ApiProperty({
    description: 'When the user joined the trip.',
    type: String,
    format: 'date-time',
    example: '2026-03-15T09:10:00.000Z',
  })
  joinedAt!: Date;

  static from(entity: TripMember): TripMemberResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      userId: entity.userId,
      permission: entity.permission,
      joinedAt: entity.joinedAt,
    };
  }
}
