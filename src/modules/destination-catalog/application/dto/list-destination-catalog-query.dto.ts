import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';
import { TrimmedText } from '../../../../shared/http/dto/search-text.js';

export const DESTINATION_CATEGORIES = [
  'CITY',
  'BEACH',
  'NATURE',
  'CULTURAL',
] as const;

/** Query string of `GET /destination-catalog`: pagination plus discovery filters. */
export class ListDestinationCatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Text to look for in the destination name (case-insensitive).',
    example: 'par',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description:
      'Country name (case-insensitive, exact) or its ISO 3166-1 alpha-2 code.',
    example: 'França',
    maxLength: 100,
  })
  @TrimmedText()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Only destinations of this category.',
    enum: DESTINATION_CATEGORIES,
    example: 'CITY',
  })
  @IsOptional()
  @IsIn(DESTINATION_CATEGORIES)
  category?: (typeof DESTINATION_CATEGORIES)[number];
}
