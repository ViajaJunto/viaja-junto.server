import { ApiProperty } from '@nestjs/swagger';
import type { DestinationCatalog } from '../../domain/destination-catalog.entity.js';

/**
 * Response body for a destination.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class DestinationCatalogResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({ description: 'Destination name.', example: 'Paris' })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'Country.',
    example: 'Franca',
    nullable: true,
  })
  country!: string | null;

  @ApiProperty({
    type: String,
    description: 'ISO 3166-1 alpha-2 code of the country.',
    example: 'FR',
    nullable: true,
  })
  countryCode!: string | null;

  @ApiProperty({
    description: 'Discovery category.',
    enum: ['CITY', 'BEACH', 'NATURE', 'CULTURAL'],
    example: 'CITY',
    nullable: true,
  })
  category!: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL' | null;

  @ApiProperty({
    type: String,
    description: 'Summary.',
    example: 'Capital da Franca, conhecida pelos museus e pela gastronomia.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    type: Number,
    description: 'Latitude in decimal degrees.',
    example: 48.856614,
    nullable: true,
  })
  latitude!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Longitude in decimal degrees.',
    example: 2.3522219,
    nullable: true,
  })
  longitude!: number | null;

  @ApiProperty({
    type: String,
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://cdn.viajajunto.app/destinos/paris.jpg',
    nullable: true,
  })
  photoUrl!: string | null;

  @ApiProperty({
    type: Number,
    description:
      'Average rating, 1 to 5, from the reviews of travellers who completed a trip here. Null until the first review.',
    example: 4.7,
    nullable: true,
  })
  averageRating!: number | null;

  @ApiProperty({
    description: 'How many reviews the average rating is based on.',
    minimum: 0,
    example: 38,
  })
  reviewCount!: number;

  static from(entity: DestinationCatalog): DestinationCatalogResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      country: entity.country ?? null,
      countryCode: entity.countryCode ?? null,
      category: entity.category ?? null,
      description: entity.description ?? null,
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      photoUrl: entity.photoUrl ?? null,
      averageRating: entity.averageRating ?? null,
      reviewCount: entity.reviewCount,
    };
  }
}
