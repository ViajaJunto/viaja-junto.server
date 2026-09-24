import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Request body for creating a activity. */
export class CreateActivityCatalogDto {
  @ApiProperty({
    description: 'Activity name.',
    example: 'Museu do Louvre',
    minLength: 2,
    maxLength: 160,
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional({
    description: 'What the activity is about.',
    example: 'Maior museu de arte do mundo, no 1er arrondissement.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Category used for filtering and for budget breakdown.',
    enum: ['TOUR', 'FOOD', 'LODGING', 'TRANSPORT', 'OTHER'],
    example: 'TOUR',
  })
  @IsIn(['TOUR', 'FOOD', 'LODGING', 'TRANSPORT', 'OTHER'])
  type!: 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';

  @ApiPropertyOptional({
    description: 'Street address or meeting point.',
    example: 'Rue de Rivoli, 75001',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'City.',
    example: 'Paris',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country.',
    example: 'Franca',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees.',
    minimum: -90,
    maximum: 90,
    example: 48.860611,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees.',
    minimum: -180,
    maximum: 180,
    example: 2.337644,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Google Places identifier, when the entry came from that API.',
    example: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  googlePlaceId?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://cdn.viajajunto.app/atividades/louvre.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'Where the entry came from, e.g. MANUAL or GOOGLE_PLACES.',
    example: 'MANUAL',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
