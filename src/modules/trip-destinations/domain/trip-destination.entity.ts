// Entidade de dominio — sem dependencia de framework ou ORM.
export interface TripDestination {
  id: string;
  tripId: string;
  destinationCatalogId: string;
  arrival?: Date | null;
  departure?: Date | null;
  description?: string | null;
  order?: number | null;
}
