import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsDefined,
  IsInt,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { normalizeCurrency } from '../../../../shared/domain/currency.js';
import { ExpenseSplitDto, MAX_AMOUNT } from './expense-split.dto.js';

/** Request body for recording an expense. */
export class CreateTripExpenseDto {
  @ApiProperty({
    description: 'Trip the expense belongs to.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description: 'Who paid up front: the trip creator or a member.',
    format: 'uuid',
    example: '9c3d1b7a-2e55-4f10-8a6b-1d7c2f9e4b33',
  })
  @IsUUID('4')
  payerId!: string;

  @ApiProperty({
    description:
      'What was paid, in **minor units** of `currency` (cents for BRL or EUR, whole yen for JPY): R$ 90,00 is 9000.',
    minimum: 1,
    maximum: MAX_AMOUNT,
    example: 9000,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount!: number;

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency of `amount`. Defaults to the currency of the trip; when it differs, `exchangeRate` is required.',
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeCurrency(value) : value,
  )
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({
    description:
      'Units of the trip currency worth 1 unit of `currency` (1 EUR = 5.5 BRL → 5.5), as you paid it. Only when `currency` is not the trip currency.',
    minimum: 0,
    exclusiveMinimum: true,
    example: 5.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Max(1_000_000_000)
  exchangeRate?: number;

  @ApiPropertyOptional({
    description: 'What it was for.',
    example: 'Jantar no Bairro Alto',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Day it was paid (ISO 8601).',
    type: String,
    format: 'date',
    example: '2026-07-03',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  spentOn?: Date;

  @ApiProperty({ type: ExpenseSplitDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ExpenseSplitDto)
  split!: ExpenseSplitDto;
}
