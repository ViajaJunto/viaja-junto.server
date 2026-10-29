import { ApiProperty } from '@nestjs/swagger';
import type {
  ActivityCatalog,
  ActivityReview,
} from '../../domain/activity-catalog.entity.js';
import { ActivityCatalogResponseDto } from './activity-catalog-response.dto.js';

/** A review on the public activity page. The author is shown by name only. */
export class ActivityReviewResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5b0c7c1e-2f4a-4e0b-9a55-6d2f1c8e7a10',
  })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Vale cada minuto da fila.',
  })
  comment!: string | null;

  @ApiProperty({
    description: 'Name of the reviewer. Their email is never exposed.',
    example: 'Gustavo Fidelis',
  })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(entity: ActivityReview): ActivityReviewResponseDto {
    return {
      id: entity.id,
      rating: entity.rating,
      comment: entity.comment,
      authorName: entity.authorName,
      createdAt: entity.createdAt,
    };
  }
}

/** The public page of an activity: the entry, its rating and the latest reviews (FR23). */
export class ActivityCatalogDetailsResponseDto extends ActivityCatalogResponseDto {
  @ApiProperty({
    description: 'The most recent reviews, newest first.',
    type: [ActivityReviewResponseDto],
  })
  latestReviews!: ActivityReviewResponseDto[];

  static fromDetails(
    entity: ActivityCatalog,
    reviews: ActivityReview[],
  ): ActivityCatalogDetailsResponseDto {
    return {
      ...ActivityCatalogResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        ActivityReviewResponseDto.from(review),
      ),
    };
  }
}
