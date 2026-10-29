import { ApiProperty } from '@nestjs/swagger';
import type { ExternalPlace } from '../../domain/places.provider.js';
import type {
  ActivityType,
  DestinationCategory,
} from '../../domain/place-mapping.js';

export class PlaceInCatalogDto {
  @ApiProperty({ description: 'Already imported as a catalog activity.' })
  activity!: boolean;

  @ApiProperty({ description: 'Already imported as a catalog destination.' })
  destination!: boolean;
}

/** A place found in the external provider, with what importing it would do. */
export class PlaceResponseDto {
  @ApiProperty({ example: 'osm:node:240109189' })
  externalId!: string;

  @ApiProperty({ example: 'Musée du Louvre' })
  name!: string;

  @ApiProperty({ example: 'Musée du Louvre, Rue de Rivoli, Paris, França' })
  displayName!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Paris' })
  city!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'França' })
  country!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'FR' })
  countryCode!: string | null;

  @ApiProperty({ example: 48.8606 })
  latitude!: number;

  @ApiProperty({ example: 2.3376 })
  longitude!: number;

  @ApiProperty({
    description:
      'The activity type the import would assign; an admin can change it afterwards.',
    enum: ['TOUR', 'FOOD', 'LODGING', 'TRANSPORT', 'OTHER'],
    example: 'TOUR',
  })
  suggestedActivityType!: ActivityType;

  @ApiProperty({
    description:
      'The destination category the import would assign, when known.',
    enum: ['CITY', 'BEACH', 'NATURE', 'CULTURAL'],
    nullable: true,
    type: String,
    example: 'CITY',
  })
  suggestedDestinationCategory!: DestinationCategory | null;

  @ApiProperty({ type: PlaceInCatalogDto })
  inCatalog!: PlaceInCatalogDto;

  static from(
    place: ExternalPlace,
    suggestions: {
      activityType: ActivityType;
      destinationCategory: DestinationCategory | null;
    },
    inCatalog: PlaceInCatalogDto,
  ): PlaceResponseDto {
    return {
      externalId: place.externalId,
      name: place.name,
      displayName: place.displayName,
      city: place.city,
      country: place.country,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      suggestedActivityType: suggestions.activityType,
      suggestedDestinationCategory: suggestions.destinationCategory,
      inCatalog,
    };
  }
}

/** The result of a search, with the attribution OpenStreetMap's licence requires. */
export class PlaceSearchResponseDto {
  @ApiProperty({
    description:
      'Credit that must be shown wherever these results are displayed.',
    example: '© OpenStreetMap contributors',
  })
  attribution!: string;

  @ApiProperty({ type: [PlaceResponseDto] })
  results!: PlaceResponseDto[];
}
