import { ApiProperty } from '@nestjs/swagger';
import { ActivityCatalogResponseDto } from '../../../activity-catalog/application/dto/activity-catalog-response.dto.js';

/** The activities of a destination, from the catalog and, if needed, Google Places. */
export class DestinationActivitiesResponseDto {
  @ApiProperty({
    description: 'The activities, best rated first.',
    type: [ActivityCatalogResponseDto],
  })
  data!: ActivityCatalogResponseDto[];

  @ApiProperty({
    description:
      'How many of them were fetched from Google Places by this request and added to the catalog (0 when the catalog already had enough).',
    example: 0,
  })
  imported!: number;

  @ApiProperty({
    description:
      'Credit that must be shown wherever the data is displayed (Google for its places, OpenStreetMap for the ones imported from there).',
    example: 'Powered by Google',
  })
  attribution!: string;
}
