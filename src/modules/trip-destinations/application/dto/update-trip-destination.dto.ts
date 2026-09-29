import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTripDestinationDto } from './create-trip-destination.dto.js';

/**
 * Request body for updating a trip destination.
 *
 * Derived from CreateTripDestinationDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateTripDestinationDto extends PartialType(
  OmitType(CreateTripDestinationDto, [
    'tripId',
    'destinationCatalogId',
  ] as const),
) {}
