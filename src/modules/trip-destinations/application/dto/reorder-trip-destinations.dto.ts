import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Request body for reordering the itinerary of a trip. */
export class ReorderTripDestinationsDto {
  @ApiProperty({
    description:
      'Every destination id of the trip, in the new itinerary order. Must be exactly the trip’s destinations, each once.',
    type: [String],
    format: 'uuid',
    example: [
      '55555555-5555-4555-8555-555555555555',
      '44444444-4444-4444-8444-444444444444',
    ],
  })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  destinationIds!: string[];
}
