import { PartialType } from '@nestjs/swagger';
import { CreateTripDto } from './create-trip.dto.js';

/**
 * Request body for updating a trip.
 *
 * Derived from CreateTripDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateTripDto extends PartialType(CreateTripDto) {}
