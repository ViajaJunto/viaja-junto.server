import { ApiProperty } from '@nestjs/swagger';
import type { TripExpense } from '../../domain/trip-expense.entity.js';
import { ExpenseSplitDto } from './expense-split.dto.js';

/** Response body for an expense. */
export class TripExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tripId!: string;

  @ApiProperty({ format: 'uuid', description: 'Who paid up front.' })
  payerId!: string;

  @ApiProperty({ description: 'Minor units of `currency`.', example: 9000 })
  amount!: number;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Units of the trip currency per unit of `currency`; null when they are the same.',
    example: null,
  })
  exchangeRate!: number | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  spentOn!: Date | null;

  @ApiProperty({ type: ExpenseSplitDto })
  split!: ExpenseSplitDto;

  @ApiProperty({ format: 'uuid', description: 'Who recorded it.' })
  createdBy!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static from(entity: TripExpense): TripExpenseResponseDto {
    return {
      id: entity.id,
      tripId: entity.tripId,
      payerId: entity.payerId,
      amount: entity.amount,
      currency: entity.currency,
      exchangeRate: entity.exchangeRate,
      description: entity.description,
      spentOn: entity.spentOn,
      split: ExpenseSplitDto.fromSplit(entity.split),
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    };
  }
}
