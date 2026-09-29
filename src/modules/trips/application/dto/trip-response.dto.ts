import { ApiProperty } from '@nestjs/swagger';
import type { Trip } from '../../domain/trip.entity.js';

/**
 * Response body for a trip.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class TripResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({ description: 'Trip name.', example: 'Eurotrip 2026' })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'Free-text notes.',
    example: 'Duas semanas entre Portugal, Espanha e Franca.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'First day of the trip.',
    type: String,
    format: 'date',
    example: '2026-07-01',
    nullable: true,
  })
  startDate!: Date | null;

  @ApiProperty({
    description: 'Last day of the trip.',
    type: String,
    format: 'date',
    example: '2026-07-15',
    nullable: true,
  })
  endDate!: Date | null;

  @ApiProperty({
    description: 'Planning stage.',
    enum: ['PLANNING', 'CONFIRMED', 'COMPLETED'],
    example: 'PLANNING',
  })
  status!: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';

  @ApiProperty({
    description: 'Owner of the trip.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'When the trip was created.',
    type: String,
    format: 'date-time',
    example: '2026-03-14T18:22:05.000Z',
  })
  createdAt!: Date;

  static from(entity: Trip): TripResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      startDate: entity.startDate ?? null,
      endDate: entity.endDate ?? null,
      status: entity.status,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    };
  }
}
