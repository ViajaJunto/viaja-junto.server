// Domain entity — no framework and no ORM dependency.
/** A destination with the rating derived from the reviews of its activities. */
export interface RatedDestination extends DestinationCatalog {
  /** Average rating, 1 to 5, weighted by how many reviews each activity has. */
  rating: number;
  /** Reviews the rating is based on. */
  reviewCount: number;
}

export interface DestinationCatalog {
  id: string;
  name: string;
  country?: string | null;
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL' | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
}
