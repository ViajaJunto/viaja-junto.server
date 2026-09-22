import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Standard query string for list endpoints.
 * Offset pagination: simple to implement and sufficient for the volumes
 * this project expects.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Numero da pagina, comecando em 1.',
    minimum: 1,
    default: DEFAULT_PAGE,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be 1 or greater' })
  @IsOptional()
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: `Quantidade de registros por pagina (maximo ${MAX_LIMIT}).`,
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
    example: 20,
  })
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be 1 or greater' })
  @Max(MAX_LIMIT, { message: `limit must not exceed ${MAX_LIMIT}` })
  @IsOptional()
  limit?: number = DEFAULT_LIMIT;
}

/** Converts the query into a skip/take window for the repository. */
export function toPageRequest(query: PaginationQueryDto): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}
