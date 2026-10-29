import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';
import { TrimmedText } from '../../../../shared/http/dto/search-text.js';

export const ACTIVITY_TYPES = [
  'TOUR',
  'FOOD',
  'LODGING',
  'TRANSPORT',
  'OTHER',
] as const;

export const ACTIVITY_SORTS = ['name', 'rating'] as const;

/** Query string of `GET /activity-catalog`: pagination plus discovery filters. */
export class ListActivityCatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Text to look for in the activity name (case-insensitive).',
    example: 'louvre',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Only activities of this type.',
    enum: ACTIVITY_TYPES,
    example: 'FOOD',
  })
  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  type?: (typeof ACTIVITY_TYPES)[number];

  @ApiPropertyOptional({
    description:
      'Only activities whose average rating is at least this value. Unrated activities are left out.',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'City name (case-insensitive, exact).',
    example: 'Paris',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country name (case-insensitive, exact).',
    example: 'França',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description:
      'Order of the results: `name` (A to Z, default) or `rating` (best rated first, unrated last).',
    enum: ACTIVITY_SORTS,
    default: 'name',
    example: 'rating',
  })
  @IsOptional()
  @IsIn(ACTIVITY_SORTS)
  sort?: (typeof ACTIVITY_SORTS)[number];
}
