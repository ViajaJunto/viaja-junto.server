import { PartialType } from '@nestjs/swagger';
import { CreateActivityCatalogDto } from './create-activity-catalog.dto.js';

/**
 * Request body for updating a activity.
 *
 * Derived from CreateActivityCatalogDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateActivityCatalogDto extends PartialType(CreateActivityCatalogDto) {}
