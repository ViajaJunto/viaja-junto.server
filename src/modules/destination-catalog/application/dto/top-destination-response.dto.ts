import { ApiProperty } from '@nestjs/swagger';
import type { RatedDestination } from '../../domain/destination-catalog.entity.js';
import { DestinationCatalogResponseDto } from './destination-catalog-response.dto.js';

/** A highlighted destination of the home page (FR25). */
export class TopDestinationResponseDto extends DestinationCatalogResponseDto {
  @ApiProperty({
    description:
      'Average rating, 1 to 5: the mean of every review given to the activities located in this destination.',
    minimum: 1,
    maximum: 5,
    example: 4.7,
  })
  rating!: number;

  @ApiProperty({
    description: 'How many reviews the rating is based on.',
    minimum: 1,
    example: 38,
  })
  reviewCount!: number;

  static fromRated(entity: RatedDestination): TopDestinationResponseDto {
    return {
      ...DestinationCatalogResponseDto.from(entity),
      rating: entity.rating,
      reviewCount: entity.reviewCount,
    };
  }
}
