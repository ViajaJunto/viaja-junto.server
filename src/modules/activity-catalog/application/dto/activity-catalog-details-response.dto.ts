import { ApiProperty } from '@nestjs/swagger';
import type { PublicReview } from '../../../../shared/domain/public-review.js';
import { PublicReviewResponseDto } from '../../../../shared/http/dto/public-review-response.dto.js';
import type { ActivityCatalog } from '../../domain/activity-catalog.entity.js';
import { ActivityCatalogResponseDto } from './activity-catalog-response.dto.js';

/** The public page of an activity: the entry, its rating and the latest reviews (FR23). */
export class ActivityCatalogDetailsResponseDto extends ActivityCatalogResponseDto {
  @ApiProperty({
    description: 'The most recent reviews, newest first.',
    type: [PublicReviewResponseDto],
  })
  latestReviews!: PublicReviewResponseDto[];

  static fromDetails(
    entity: ActivityCatalog,
    reviews: PublicReview[],
  ): ActivityCatalogDetailsResponseDto {
    return {
      ...ActivityCatalogResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        PublicReviewResponseDto.from(review),
      ),
    };
  }
}
