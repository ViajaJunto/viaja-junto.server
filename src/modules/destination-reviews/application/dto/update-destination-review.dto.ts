import { PartialType, PickType } from '@nestjs/swagger';
import { CreateDestinationReviewDto } from './create-destination-review.dto.js';

/** Only the rating and the comment can change; the destination cannot. */
export class UpdateDestinationReviewDto extends PartialType(
  PickType(CreateDestinationReviewDto, ['rating', 'comment'] as const),
) {}
