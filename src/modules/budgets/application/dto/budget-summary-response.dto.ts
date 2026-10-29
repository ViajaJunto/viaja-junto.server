import { ApiProperty } from '@nestjs/swagger';
import {
  ACTIVITY_TYPES,
  type ActivityType,
  type BudgetSummary,
  type CategoryConsumption,
} from '../../domain/budget-summary.js';

export class CategoryConsumptionDto implements CategoryConsumption {
  @ApiProperty({ enum: ACTIVITY_TYPES, example: 'FOOD' })
  type!: ActivityType;

  @ApiProperty({
    description: 'Expected cost of the activities of this type.',
    example: 320.5,
  })
  planned!: number;

  @ApiProperty({
    description: 'How many planned activities have this type.',
    example: 4,
  })
  count!: number;
}

/** Where the budget of a trip stands (FR16, FR17). */
export class BudgetSummaryResponseDto implements BudgetSummary {
  @ApiProperty({
    description: 'ISO 4217 currency of every amount, inherited from the trip.',
    example: 'BRL',
  })
  currency!: string;

  @ApiProperty({
    description: 'Total budget; null while the trip has no budget.',
    type: Number,
    nullable: true,
    example: 8500,
  })
  totalValue!: number | null;

  @ApiProperty({
    description:
      'Sum of the expected cost of the trip’s planned activities. Derived, never typed in.',
    example: 1240.75,
  })
  planned!: number;

  @ApiProperty({
    description:
      'Total budget minus what is planned; negative when over budget, null without a budget.',
    type: Number,
    nullable: true,
    example: 7259.25,
  })
  remaining!: number | null;

  @ApiProperty({
    description: 'True when what is planned exceeds the total budget.',
    example: false,
  })
  overBudget!: boolean;

  @ApiProperty({ description: 'Planned activities in the trip.', example: 9 })
  activityCount!: number;

  @ApiProperty({
    description:
      'Activities without an expected cost; they count as 0 in `planned`.',
    example: 2,
  })
  unpricedActivities!: number;

  @ApiProperty({
    description:
      'Consumption per activity type, always all five types in a fixed order.',
    type: [CategoryConsumptionDto],
  })
  byCategory!: CategoryConsumptionDto[];
}
