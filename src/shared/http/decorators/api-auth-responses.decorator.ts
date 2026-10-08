import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

/** Documents a route that needs `Authorization: Bearer <token>` (401 otherwise). */
export const ApiAuthenticated = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid access token.',
      type: ErrorResponseDto,
    }),
  );

/** Documents the 403 answered when the caller is signed in but not allowed. */
export const ApiForbidden = (description: string) =>
  ApiForbiddenResponse({ description, type: ErrorResponseDto });
