import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/** Request body for creating a trip destination. */
export class CreateTripDestinationDto {
  @ApiProperty({ description: 'Trip this stop belongs to.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({ description: 'Catalog destination being visited.', format: 'uuid', example: 'b17c9d42-8e31-4a55-9f02-6c4d8e1a7b90' })
  @IsUUID('4')
  destinationCatalogId!: string;

  @ApiPropertyOptional({ description: 'Arrival date (ISO 8601).', type: String, format: 'date', example: '2026-07-03' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  arrival?: Date;

  @ApiPropertyOptional({ description: 'Departure date (ISO 8601). Must not be earlier than arrival.', type: String, format: 'date', example: '2026-07-07' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departure?: Date;

  @ApiPropertyOptional({ description: 'Notes specific to this stop.', example: 'Hospedagem no 11e arrondissement.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Position in the itinerary, ascending. Stops without a value are listed last.', minimum: 0, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
