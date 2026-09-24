import { ApiProperty } from '@nestjs/swagger';
import type { Review } from '../../domain/review.entity.js';

/**
 * Response body for a review.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class ReviewResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({
    description: 'Author.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  userId!: string;

  @ApiProperty({
    description: 'Reviewed activity.',
    format: 'uuid',
    example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41',
  })
  activityId!: string;

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
    example: 'Vale muito a pena, mas va cedo para evitar fila.',
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

  static from(entity: Review): ReviewResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      activityId: entity.activityId,
      rating: entity.rating,
      comment: entity.comment ?? null,
      createdAt: entity.createdAt,
    };
  }
}
