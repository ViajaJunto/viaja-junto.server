import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { TrimmedText } from '../../../../shared/http/dto/search-text.js';

export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 10;

/** Query string of `GET /places/search`. */
export class SearchPlacesQueryDto {
  @ApiProperty({
    description: 'What to look for, as you would type it on a map.',
    example: 'Museu do Louvre, Paris',
    minLength: 2,
    maxLength: 100,
  })
  @TrimmedText()
  @IsString()
  @Length(2, 100)
  q!: string;

  @ApiPropertyOptional({
    description: `How many places to return (maximum ${MAX_SEARCH_LIMIT}).`,
    minimum: 1,
    maximum: MAX_SEARCH_LIMIT,
    default: DEFAULT_SEARCH_LIMIT,
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SEARCH_LIMIT)
  limit: number = DEFAULT_SEARCH_LIMIT;
}
