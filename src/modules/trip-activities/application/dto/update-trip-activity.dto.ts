import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTripActivityDto } from './create-trip-activity.dto.js';

/**
 * Request body for updating a planned activity.
 *
 * Derived from CreateTripActivityDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateTripActivityDto extends PartialType(
  OmitType(CreateTripActivityDto, [
    'tripDestinationId',
    'activityCatalogId',
  ] as const),
) {}
