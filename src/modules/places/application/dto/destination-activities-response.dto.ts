import { ApiProperty } from '@nestjs/swagger';
import { ActivityCatalogResponseDto } from '../../../activity-catalog/application/dto/activity-catalog-response.dto.js';

/** The activities of a destination, from the catalog and, if needed, OpenStreetMap. */
export class DestinationActivitiesResponseDto {
  @ApiProperty({
    description: 'The activities, best rated first.',
    type: [ActivityCatalogResponseDto],
  })
  data!: ActivityCatalogResponseDto[];

  @ApiProperty({
    description:
      'How many of them were fetched from OpenStreetMap by this request and added to the catalog (0 when the catalog already had enough).',
    example: 0,
  })
  imported!: number;

  @ApiProperty({
    description: 'Credit that must be shown wherever the data is displayed.',
    example: '© OpenStreetMap contributors',
  })
  attribution!: string;
}
