import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from '../dto/pagination-query.dto.js';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../dto/paginated-response.dto.js';

/**
 * Documents a paginated list endpoint: the `page`/`limit` query parameters
 * and the `{ data, meta }` envelope with `data` typed as the given model.
 *
 * OpenAPI has no generics, so the schema is assembled by hand with
 * allOf + $ref — without it Swagger would render `data` as an untyped array.
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description = 'Pagina de resultados.',
) =>
  applyDecorators(
    ApiExtraModels(PaginatedResponseDto, PaginationMetaDto, model),
    ApiQuery({
      name: 'page',
      required: false,
      schema: { type: 'integer', minimum: 1, default: DEFAULT_PAGE },
      description: 'Numero da pagina, comecando em 1.',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_LIMIT,
        default: DEFAULT_LIMIT,
      },
      description: `Registros por pagina (maximo ${MAX_LIMIT}).`,
      example: 20,
    }),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(model) } },
            },
          },
        ],
      },
    }),
  );
