import { ApiProperty } from '@nestjs/swagger';
import type { TripDestination } from '../../domain/trip-destination.entity.js';

/**
 * Response body for a trip destination.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class TripDestinationResponseDto {
  @ApiProperty({ description: 'Unique identifier.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id!: string;

  @ApiProperty({ description: 'Trip this stop belongs to.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  tripId!: string;

  @ApiProperty({ description: 'Catalog destination.', format: 'uuid', example: 'b17c9d42-8e31-4a55-9f02-6c4d8e1a7b90' })
  destinationCatalogId!: string;

  @ApiProperty({ description: 'Arrival date.', type: String, format: 'date', example: '2026-07-03', nullable: true })
  arrival!: Date | null;

  @ApiProperty({ description: 'Departure date.', type: String, format: 'date', example: '2026-07-07', nullable: true })
  departure!: Date | null;

  @ApiProperty({ description: 'Notes for this stop.', example: 'Hospedagem no 11e arrondissement.', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Position in the itinerary.', example: 1, nullable: true })
  order!: number | null;

  static from(entity: TripDestination): TripDestinationResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      destinationCatalogId: entity.destinationCatalogId,
      arrival: entity.arrival ?? null,
      departure: entity.departure ?? null,
      description: entity.description ?? null,
      order: entity.order ?? null,
    };
  }
}
