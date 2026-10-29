import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Split } from '../../../../shared/expenses/index.js';

const MAX_PEOPLE = 50;
export const MAX_AMOUNT = 2_000_000_000;

export class ExactShareDto {
  @ApiProperty({ format: 'uuid', description: 'Who owes this amount.' })
  @IsUUID('4')
  participant!: string;

  @ApiProperty({
    description:
      'What they owe, in minor units of the expense currency. May be 0.',
    minimum: 0,
    example: 4000,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount!: number;
}

export class WeightDto {
  @ApiProperty({ format: 'uuid', description: 'Who takes part in the split.' })
  @IsUUID('4')
  participant!: string;

  @ApiProperty({
    description:
      'Their weight: a percentage, a number of nights, a head-count...',
    minimum: 0,
    exclusiveMinimum: true,
    example: 3,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  weight!: number;
}

/** How an expense is shared. Send only the field that goes with `type`. */
export class ExpenseSplitDto {
  @ApiProperty({
    description:
      '`equal`: everyone in `participants` pays the same. `exact`: each person owes the amount in `shares` (they must add up to the expense). `proportional`: shares follow the `weights`. Rounding leftovers go, one cent each, to the biggest remainders.',
    enum: ['equal', 'exact', 'proportional'],
    example: 'equal',
  })
  @IsIn(['equal', 'exact', 'proportional'])
  type!: Split['type'];

  @ApiPropertyOptional({
    description: 'For `equal`: who shares the expense.',
    type: [String],
    format: 'uuid',
  })
  @ValidateIf((split: ExpenseSplitDto) => split.type === 'equal')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PEOPLE)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  participants?: string[];

  @ApiPropertyOptional({
    description: 'For `exact`: what each person owes.',
    type: [ExactShareDto],
  })
  @ValidateIf((split: ExpenseSplitDto) => split.type === 'exact')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => ExactShareDto)
  shares?: ExactShareDto[];

  @ApiPropertyOptional({
    description: 'For `proportional`: the weight of each person.',
    type: [WeightDto],
  })
  @ValidateIf((split: ExpenseSplitDto) => split.type === 'proportional')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_PEOPLE)
  @ValidateNested({ each: true })
  @Type(() => WeightDto)
  weights?: WeightDto[];

  /** The library's `Split` for this payload. */
  static toSplit(dto: ExpenseSplitDto): Split {
    switch (dto.type) {
      case 'equal':
        return { type: 'equal', participants: dto.participants ?? [] };
      case 'exact':
        return {
          type: 'exact',
          shares: (dto.shares ?? []).map(({ participant, amount }) => ({
            participant,
            amount,
          })),
        };
      case 'proportional':
        return {
          type: 'proportional',
          weights: (dto.weights ?? []).map(({ participant, weight }) => ({
            participant,
            weight,
          })),
        };
    }
  }

  /** The DTO for a stored `Split`, carrying only the field that matches its type. */
  static fromSplit(split: Split): ExpenseSplitDto {
    switch (split.type) {
      case 'equal':
        return { type: 'equal', participants: split.participants };
      case 'exact':
        return { type: 'exact', shares: split.shares };
      case 'proportional':
        return { type: 'proportional', weights: split.weights };
    }
  }
}
