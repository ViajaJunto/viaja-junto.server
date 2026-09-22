import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** Request body for creating a planned activity. */
export class CreateTripActivityDto {
  @ApiProperty({ description: 'Itinerary stop this activity belongs to.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  @IsUUID('4')
  tripDestinationId!: string;

  @ApiProperty({ description: 'Catalog activity being scheduled.', format: 'uuid', example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41' })
  @IsUUID('4')
  activityCatalogId!: string;

  @ApiPropertyOptional({ description: 'Scheduled start, ISO 8601 with timezone.', type: String, format: 'date-time', example: '2026-07-04T10:30:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTime?: Date;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes. Capped at one week.', minimum: 1, maximum: 10080, example: 180 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Estimated cost per person, feeding the trip budget.', minimum: 0, example: 22.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedCost?: number;

  @ApiPropertyOptional({ description: 'Booking status. Defaults to PENDING.', enum: ['PENDING', 'CONFIRMED', 'COMPLETED'], default: 'PENDING', example: 'PENDING' })
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED'])
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
