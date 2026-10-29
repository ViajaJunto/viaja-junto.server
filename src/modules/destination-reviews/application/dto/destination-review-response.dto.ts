import { ApiProperty } from '@nestjs/swagger';
import type { DestinationReview } from '../../domain/destination-review.entity.js';

/**
 * Response body for a destination review.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class DestinationReviewResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '5b0c7c1e-2f4a-4e0b-9a55-6d2f1c8e7a10',
  })
  id!: string;

  @ApiProperty({
    description: 'Author.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  userId!: string;

  @ApiProperty({
    description: 'Reviewed destination.',
    format: 'uuid',
    example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41',
  })
  destinationId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5.',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  rating!: number;

  @ApiProperty({
    type: String,
    description: 'Free-text review.',
    example: 'Cidade linda e fácil de explorar a pé.',
    nullable: true,
  })
  comment!: string | null;

  @ApiProperty({
    description: 'When the review was written.',
    type: String,
    format: 'date-time',
    example: '2026-08-02T19:45:00.000Z',
  })
  createdAt!: Date;

  static from(entity: DestinationReview): DestinationReviewResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      destinationId: entity.destinationId,
      rating: entity.rating,
      comment: entity.comment ?? null,
      createdAt: entity.createdAt,
    };
  }
}
