import { ApiProperty } from '@nestjs/swagger';
import type { VisitedCountry } from '../../domain/visited-countries.js';

/** A country the user has been to, for the map (FR11). */
export class VisitedCountryResponseDto implements VisitedCountry {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Country name as stored in the catalog.',
    example: 'França',
  })
  country!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'ISO 3166-1 alpha-2 code, ready for the frontend map; null when the catalog does not know it.',
    example: 'FR',
  })
  countryCode!: string | null;

  @ApiProperty({
    description: 'In how many of the user’s completed trips it appears.',
    example: 2,
  })
  tripCount!: number;
}
