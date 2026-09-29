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

/** Request body for creating a destination. */
export class CreateDestinationCatalogDto {
  @ApiProperty({
    description: 'Destination name as travellers know it.',
    example: 'Paris',
    minLength: 2,
    maxLength: 160,
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional({
    description: 'Country the destination belongs to.',
    example: 'Franca',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Used by the discovery filters.',
    enum: ['CITY', 'BEACH', 'NATURE', 'CULTURAL'],
    example: 'CITY',
  })
  @IsOptional()
  @IsIn(['CITY', 'BEACH', 'NATURE', 'CULTURAL'])
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL';

  @ApiPropertyOptional({
    description: 'Short summary shown on the destination page.',
    example: 'Capital da Franca, conhecida pelos museus e pela gastronomia.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Latitude in decimal degrees, for the interactive map.',
    minimum: -90,
    maximum: 90,
    example: 48.856614,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude in decimal degrees, for the interactive map.',
    minimum: -180,
    maximum: 180,
    example: 2.3522219,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Cover image URL.',
    format: 'uri',
    example: 'https://cdn.viajajunto.app/destinos/paris.jpg',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  @MaxLength(2048)
  photoUrl?: string;
}
