import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

/** Request body for creating a budget. */
export class CreateBudgetDto {
  @ApiProperty({ description: 'Trip this budget belongs to. One budget per trip.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({ description: 'Total amount available for the trip, in the group currency.', minimum: 0, example: 8500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalValue!: number;

  @ApiPropertyOptional({ description: 'Amount already committed to planned activities. Defaults to 0.', minimum: 0, default: 0, example: 1240.75 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  plannedActivities?: number;
}
