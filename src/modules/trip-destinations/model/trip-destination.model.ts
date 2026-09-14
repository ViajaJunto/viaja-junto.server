export interface TripDestination {
  id: string;
  tripId: string;
  destinationCatalogId: string;
  arrival?: Date;
  departure?: Date;
  description?: string;
  order?: number;
}
