import { ApiProperty } from '@nestjs/swagger';
import type { PublicReview } from '../../domain/public-review.js';

/** A review on a public catalog page. The author is shown by name only. */
export class PublicReviewResponseDto {
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

  static from(entity: PublicReview): PublicReviewResponseDto {
    return {
      id: entity.id,
      rating: entity.rating,
      comment: entity.comment,
      authorName: entity.authorName,
      createdAt: entity.createdAt,
    };
  }
}
