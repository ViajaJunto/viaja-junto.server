import { ApiProperty } from '@nestjs/swagger';
import type {
  DestinationCatalog,
  DestinationReviewSummary,
} from '../../domain/destination-catalog.entity.js';
import { DestinationCatalogResponseDto } from './destination-catalog-response.dto.js';

/** A review on the public destination page. The author is shown by name only. */
export class DestinationReviewSummaryResponseDto {
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
    example: 'Cidade linda, voltaria sem pensar duas vezes.',
  })
  comment!: string | null;

  @ApiProperty({
    description: 'Name of the reviewer. Their email is never exposed.',
    example: 'Gustavo Fidelis',
  })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(
    entity: DestinationReviewSummary,
  ): DestinationReviewSummaryResponseDto {
    return {
      id: entity.id,
      rating: entity.rating,
      comment: entity.comment,
      authorName: entity.authorName,
      createdAt: entity.createdAt,
    };
  }
}

/** The public page of a destination: the entry, its rating and the latest reviews. */
export class DestinationCatalogDetailsResponseDto extends DestinationCatalogResponseDto {
  @ApiProperty({
    description: 'The most recent reviews, newest first.',
    type: [DestinationReviewSummaryResponseDto],
  })
  latestReviews!: DestinationReviewSummaryResponseDto[];

  static fromDetails(
    entity: DestinationCatalog,
    reviews: DestinationReviewSummary[],
  ): DestinationCatalogDetailsResponseDto {
    return {
      ...DestinationCatalogResponseDto.from(entity),
      latestReviews: reviews.map((review) =>
        DestinationReviewSummaryResponseDto.from(review),
      ),
    };
  }
}
