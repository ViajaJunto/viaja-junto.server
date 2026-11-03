import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  POI_CATEGORIES,
  type PoiCategory,
} from '../../domain/points-of-interest.provider.js';

export const DEFAULT_ACTIVITIES_LIMIT = 10;
/** Google Places returns at most 20 places per search. */
export const MAX_ACTIVITIES_LIMIT = 20;

/** Query string of `GET /destination-catalog/:id/activities`. */
export class DestinationActivitiesQueryDto {
  @ApiPropertyOptional({
    description: 'What kind of place to look for.',
    enum: POI_CATEGORIES,
    default: 'TOUR',
    example: 'TOUR',
  })
  @IsOptional()
  @IsIn(POI_CATEGORIES)
  type: PoiCategory = 'TOUR';

  @ApiPropertyOptional({
    description: `How many activities to return (maximum ${MAX_ACTIVITIES_LIMIT}).`,
    minimum: 1,
    maximum: MAX_ACTIVITIES_LIMIT,
    default: DEFAULT_ACTIVITIES_LIMIT,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ACTIVITIES_LIMIT)
  limit: number = DEFAULT_ACTIVITIES_LIMIT;
}
