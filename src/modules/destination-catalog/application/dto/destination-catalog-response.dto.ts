import { ApiProperty } from '@nestjs/swagger';
import type { DestinationCatalog } from '../../domain/destination-catalog.entity.js';

/**
 * Response body for a destination.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class DestinationCatalogResponseDto {
  @ApiProperty({ description: 'Unique identifier.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id!: string;

  @ApiProperty({ description: 'Destination name.', example: 'Paris' })
  name!: string;

  @ApiProperty({ description: 'Country.', example: 'Franca', nullable: true })
  country!: string | null;

  @ApiProperty({ description: 'Discovery category.', enum: ['CITY', 'BEACH', 'NATURE', 'CULTURAL'], example: 'CITY', nullable: true })
  category!: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL' | null;

  @ApiProperty({ description: 'Summary.', example: 'Capital da Franca, conhecida pelos museus e pela gastronomia.', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Latitude in decimal degrees.', example: 48.856614, nullable: true })
  latitude!: number | null;

  @ApiProperty({ description: 'Longitude in decimal degrees.', example: 2.3522219, nullable: true })
  longitude!: number | null;

  @ApiProperty({ description: 'Cover image URL.', format: 'uri', example: 'https://cdn.viajajunto.app/destinos/paris.jpg', nullable: true })
  photoUrl!: string | null;

  static from(entity: DestinationCatalog): DestinationCatalogResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      country: entity.country ?? null,
      category: entity.category ?? null,
      description: entity.description ?? null,
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      photoUrl: entity.photoUrl ?? null,
    };
  }
}
