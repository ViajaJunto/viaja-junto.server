export class CreateTripDestinationDto {
  tripId!: string;
  destinationCatalogId!: string;
  arrival?: Date;
  departure?: Date;
  description?: string;
  order?: number;
}
