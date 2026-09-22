import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

/** Request body for creating a trip. */
export class CreateTripDto {
  @ApiProperty({ description: 'Trip name shown in the dashboard.', example: 'Eurotrip 2026', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ description: 'Free-text notes about the trip.', example: 'Duas semanas entre Portugal, Espanha e Franca.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'First day of the trip (ISO 8601).', type: String, format: 'date', example: '2026-07-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Last day of the trip (ISO 8601). Must not be earlier than startDate.', type: String, format: 'date', example: '2026-07-15' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Planning stage. Defaults to PLANNING.', enum: ['PLANNING', 'CONFIRMED', 'COMPLETED'], default: 'PLANNING', example: 'PLANNING' })
  @IsOptional()
  @IsIn(['PLANNING', 'CONFIRMED', 'COMPLETED'])
  status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';

  @ApiProperty({ description: 'Identifier of the user who owns the trip.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  @IsUUID('4')
  createdBy!: string;
}
