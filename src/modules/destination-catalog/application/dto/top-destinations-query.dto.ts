import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_TOP_LIMIT = 10;
export const MAX_TOP_LIMIT = 50;

/** Query string of `GET /destination-catalog/top`. */
export class TopDestinationsQueryDto {
  @ApiPropertyOptional({
    description: `How many destinations to return (maximum ${MAX_TOP_LIMIT}).`,
    minimum: 1,
    maximum: MAX_TOP_LIMIT,
    default: DEFAULT_TOP_LIMIT,
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TOP_LIMIT)
  limit: number = DEFAULT_TOP_LIMIT;
}
