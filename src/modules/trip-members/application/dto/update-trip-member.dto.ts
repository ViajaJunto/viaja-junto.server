import { PartialType, PickType } from '@nestjs/swagger';
import { CreateTripMemberDto } from './create-trip-member.dto.js';

/**
 * Request body for updating a trip member.
 *
 * Derived from CreateTripMemberDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateTripMemberDto extends PartialType(
  PickType(CreateTripMemberDto, ['permission'] as const),
) {}
