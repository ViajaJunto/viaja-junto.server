import { PartialType, PickType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto.js';

/**
 * Request body for updating a review.
 *
 * Derived from CreateReviewDto, so every validation rule and every piece
 * of OpenAPI metadata stays in one place; here they only become optional.
 */
export class UpdateReviewDto extends PartialType(PickType(CreateReviewDto, ['rating', 'comment'] as const)) {}
