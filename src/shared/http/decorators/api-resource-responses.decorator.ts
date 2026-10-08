import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

/** Documents the `:id` path parameter and the 400 for a malformed UUID. */
export const ApiIdParam = (description: string) =>
  applyDecorators(
    ApiParam({
      name: 'id',
      description,
      format: 'uuid',
      example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    }),
    ApiBadRequestResponse({
      description: 'The id in the path is not a valid UUID.',
      type: ErrorResponseDto,
    }),
  );

/** Documents the 404 answered when the resource does not exist. */
export const ApiNotFound = (description: string) =>
  ApiNotFoundResponse({ description, type: ErrorResponseDto });
