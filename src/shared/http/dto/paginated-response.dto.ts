import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Pagina retornada.', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Registros por pagina.', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total de registros existentes.', example: 137 })
  total!: number;

  @ApiProperty({ description: 'Total de paginas disponiveis.', example: 7 })
  totalPages!: number;

  @ApiProperty({ description: 'Existe pagina seguinte.', example: true })
  hasNext!: boolean;

  @ApiProperty({ description: 'Existe pagina anterior.', example: false })
  hasPrevious!: boolean;
}

/**
 * Envelope used by every list endpoint.
 * The type of `data` is documented per endpoint via @ApiPaginatedResponse.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Registros da pagina atual.', isArray: true })
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
