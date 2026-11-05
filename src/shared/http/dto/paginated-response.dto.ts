import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Page returned.', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Records per page.', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of records.', example: 137 })
  total!: number;

  @ApiProperty({ description: 'Total number of pages.', example: 7 })
  totalPages!: number;

  @ApiProperty({ description: 'Whether there is a next page.', example: true })
  hasNext!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page.',
    example: false,
  })
  hasPrevious!: boolean;
}

/**
 * Envelope used by every list endpoint.
 * The type of `data` is documented per endpoint via @ApiPaginatedResponse.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Records in the current page.',
    isArray: true,
    // The concrete item type is supplied per endpoint by
    // @ApiPaginatedResponse; `object` keeps the base schema valid on its own.
    type: Object,
  })
  data!: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMetaDto {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
