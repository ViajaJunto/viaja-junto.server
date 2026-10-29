import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsISO4217CurrencyCode,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
} from '../../../../shared/domain/currency.js';

/** Request body for creating a trip. The creator is the authenticated caller. */
export class CreateTripDto {
  @ApiProperty({
    description: 'Trip name shown in the dashboard.',
    example: 'Eurotrip 2026',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Free-text notes about the trip.',
    example: 'Duas semanas entre Portugal, Espanha e Franca.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'First day of the trip (ISO 8601).',
    type: String,
    format: 'date',
    example: '2026-07-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description:
      'Last day of the trip (ISO 8601). Must not be earlier than startDate.',
    type: String,
    format: 'date',
    example: '2026-07-15',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Planning stage. Defaults to PLANNING.',
    enum: ['PLANNING', 'CONFIRMED', 'COMPLETED'],
    default: 'PLANNING',
    example: 'PLANNING',
  })
  @IsOptional()
  @IsIn(['PLANNING', 'CONFIRMED', 'COMPLETED'])
  status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency of the trip (e.g. BRL, EUR, USD). The budget and the expenses of the trip are in this currency. Changing it does not convert amounts that already exist.',
    default: DEFAULT_CURRENCY,
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
}
