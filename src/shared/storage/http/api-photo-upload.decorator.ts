import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../http/dto/error-response.dto.js';
import { PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from '../domain/photo.js';

/**
 * OpenAPI documentation shared by every `PUT /<resource>/:id/photo` route.
 * The success response stays on the controller, since its type differs.
 */
export function ApiPhotoUpload(resource: string) {
  const types = Object.keys(PHOTO_CONTENT_TYPES).join(', ');
  const maxMb = PHOTO_MAX_BYTES / 1024 / 1024;

  return applyDecorators(
    ApiParam({
      name: 'id',
      description: `${resource} identifier.`,
      format: 'uuid',
      example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: `Photo sent as multipart/form-data in the \`file\` field (${types}; up to ${maxMb} MB).`,
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: `Image file (${types}).`,
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'The id in the path is not a valid UUID.',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: `No ${resource.toLowerCase()} exists with this id.`,
      type: ErrorResponseDto,
    }),
    ApiUnprocessableEntityResponse({
      description: `Missing file or unsupported format.`,
      type: ErrorResponseDto,
    }),
    ApiPayloadTooLargeResponse({
      description: `File larger than ${maxMb} MB.`,
      type: ErrorResponseDto,
    }),
    ApiServiceUnavailableResponse({
      description: 'Object storage is not configured on this server.',
      type: ErrorResponseDto,
    }),
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid access token.',
      type: ErrorResponseDto,
    }),
  );
}
