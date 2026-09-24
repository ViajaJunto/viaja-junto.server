import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Request body for creating a review. */
export class CreateReviewDto {
  @ApiProperty({
    description: 'Author of the review.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({
    description: 'Catalog activity being reviewed.',
    format: 'uuid',
    example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41',
  })
  @IsUUID('4')
  activityId!: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars.',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    description: 'Optional free-text review.',
    example: 'Vale muito a pena, mas va cedo para evitar fila.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
