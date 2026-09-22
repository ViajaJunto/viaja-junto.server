import { ApiProperty } from '@nestjs/swagger';
import type { Budget } from '../../domain/budget.entity.js';

/**
 * Response body for a budget.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class BudgetResponseDto {
  @ApiProperty({ description: 'Unique identifier.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id!: string;

  @ApiProperty({ description: 'Trip this budget belongs to.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  tripId!: string;

  @ApiProperty({ description: 'Total amount available.', example: 8500 })
  totalValue!: number;

  @ApiProperty({ description: 'Amount committed to planned activities.', example: 1240.75 })
  plannedActivities!: number;

  @ApiProperty({ description: 'When the budget was created.', type: String, format: 'date-time', example: '2026-03-16T14:00:00.000Z' })
  createdAt!: Date;

  static from(entity: Budget): BudgetResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      totalValue: entity.totalValue,
      plannedActivities: entity.plannedActivities,
      createdAt: entity.createdAt,
    };
  }
}
