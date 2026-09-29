import { ApiProperty } from '@nestjs/swagger';
import type { ActivityCatalog } from '../../domain/activity-catalog.entity.js';

/**
 * Response body for a activity.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class ActivityCatalogResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({ description: 'Activity name.', example: 'Museu do Louvre' })
  name!: string;

  @ApiProperty({
    type: String,
    description: 'What the activity is about.',
    example: 'Maior museu de arte do mundo.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Category.',
    enum: ['TOUR', 'FOOD', 'LODGING', 'TRANSPORT', 'OTHER'],
    example: 'TOUR',
  })
  type!: 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';

  @ApiProperty({
    type: String,
    description: 'Address or meeting point.',
    example: 'Rue de Rivoli, 75001',
    nullable: true,
  })
  location!: string | null;

  @ApiProperty({
    type: String,
    description: 'City.',
    example: 'Paris',
    nullable: true,
  })
  city!: string | null;

  @ApiProperty({
    type: String,
    description: 'Country.',
    example: 'Franca',
    nullable: true,
  })
  country!: string | null;

  @ApiProperty({
    type: Number,
    description: 'Latitude.',
    example: 48.860611,
    nullable: true,
  })
  latitude!: number | null;

  @ApiProperty({
    type: Number,
    description: 'Longitude.',
    example: 2.337644,
    nullable: true,
  })
  longitude!: number | null;

  @ApiProperty({
    type: String,
    description: 'Google Places identifier.',
    example: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
    nullable: true,
  })
  googlePlaceId!: string | null;

  @ApiProperty({
    type: String,
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://cdn.viajajunto.app/atividades/louvre.jpg',
    nullable: true,
  })
  photoUrl!: string | null;

  @ApiProperty({
    type: String,
    description: 'Origin of the entry.',
    example: 'MANUAL',
    nullable: true,
  })
  source!: string | null;

  @ApiProperty({
    type: Number,
    description:
      'Average of the community ratings, 1 to 5. Derived from reviews — read only.',
    minimum: 1,
    maximum: 5,
    example: 4.6,
    nullable: true,
    readOnly: true,
  })
  averageRating!: number | null;

  @ApiProperty({
    description: 'When the entry was added.',
    type: String,
    format: 'date-time',
    example: '2026-02-01T12:00:00.000Z',
  })
  createdAt!: Date;

  static from(entity: ActivityCatalog): ActivityCatalogResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      type: entity.type,
      location: entity.location ?? null,
      city: entity.city ?? null,
      country: entity.country ?? null,
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      googlePlaceId: entity.googlePlaceId ?? null,
      photoUrl: entity.photoUrl ?? null,
      source: entity.source ?? null,
      averageRating: entity.averageRating ?? null,
      createdAt: entity.createdAt,
    };
  }
}
