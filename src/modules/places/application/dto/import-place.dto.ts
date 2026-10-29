import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Request body for importing a place found with the search. */
export class ImportPlaceDto {
  @ApiProperty({
    description:
      'The `externalId` of a place returned by `GET /places/search`. The place is fetched again from the provider, so only its id is trusted.',
    example: 'osm:node:240109189',
  })
  @Matches(/^osm:(node|way|relation):[1-9]\d{0,17}$/, {
    message: 'externalId must look like osm:node:123',
  })
  externalId!: string;
}
