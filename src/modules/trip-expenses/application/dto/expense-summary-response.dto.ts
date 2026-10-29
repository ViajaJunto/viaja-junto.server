import { ApiProperty } from '@nestjs/swagger';
import type { Summary } from '../../../../shared/expenses/index.js';

export class ExpenseBalanceDto {
  @ApiProperty({ format: 'uuid' })
  participant!: string;

  @ApiProperty({ description: 'What the person paid up front.', example: 9000 })
  paid!: number;

  @ApiProperty({
    description: 'The sum of the person’s shares.',
    example: 3000,
  })
  owed!: number;

  @ApiProperty({ example: 0 })
  settled!: number;

  @ApiProperty({
    description:
      '`paid - owed`: positive = is owed money, negative = owes money.',
    example: 6000,
  })
  net!: number;
}

export class ExpenseTransferDto {
  @ApiProperty({ format: 'uuid', description: 'Who pays.' })
  from!: string;

  @ApiProperty({ format: 'uuid', description: 'Who receives.' })
  to!: string;

  @ApiProperty({
    description: 'Minor units of the trip currency.',
    example: 3000,
  })
  amount!: number;
}

/** Who owes whom on a trip. Every amount is in minor units of the trip currency. */
export class ExpenseSummaryResponseDto implements Summary {
  @ApiProperty({ description: 'The trip currency.', example: 'BRL' })
  currency!: string;

  @ApiProperty({
    description: 'Everything spent, in the trip currency.',
    example: 9000,
  })
  total!: number;

  @ApiProperty({
    description:
      'One entry per person involved, sorted by id. They always add up to zero.',
    type: [ExpenseBalanceDto],
  })
  balances!: ExpenseBalanceDto[];

  @ApiProperty({
    description:
      'Payments that settle everyone, biggest first: at most one fewer than the people with a balance.',
    type: [ExpenseTransferDto],
  })
  transfers!: ExpenseTransferDto[];
}
