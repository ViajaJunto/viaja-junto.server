import { PartialType } from '@nestjs/swagger';
import { CreateDestinationCatalogDto } from './create-destination-catalog.dto.js';

/**
 * Request body for updating a destination.
 *
 * Derived from CreateDestinationCatalogDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateDestinationCatalogDto extends PartialType(
  CreateDestinationCatalogDto,
) {}
