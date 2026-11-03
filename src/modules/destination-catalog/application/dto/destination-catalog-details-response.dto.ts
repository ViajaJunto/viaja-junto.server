import { ApiProperty } from '@nestjs/swagger';
import type { PublicReview } from '../../../../shared/domain/public-review.js';
import { PublicReviewResponseDto } from '../../../../shared/http/dto/public-review-response.dto.js';
import type { DestinationCatalog } from '../../domain/destination-catalog.entity.js';
import { DestinationCatalogResponseDto } from './destination-catalog-response.dto.js';

/** The public page of a destination: the entry, its rating and the latest reviews. */
export class DestinationCatalogDetailsResponseDto extends DestinationCatalogResponseDto {
  @ApiProperty({
    description: 'The most recent reviews, newest first.',
    type: [PublicReviewResponseDto],
  })
  latestReviews!: PublicReviewResponseDto[];

  static fromDetails(
    entity: DestinationCatalog,
    reviews: PublicReview[],
  ): DestinationCatalogDetailsResponseDto {
    return {
      ...DestinationCatalogResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        PublicReviewResponseDto.from(review),
      ),
    };
  }
}
