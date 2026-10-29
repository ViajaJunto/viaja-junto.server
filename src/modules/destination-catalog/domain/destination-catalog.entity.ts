// Domain entity — no framework and no ORM dependency.
export interface DestinationCatalog {
  id: string;
  name: string;
  country?: string | null;
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL' | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
  /** Id in the external places provider (`osm:node:123`) when imported. */
  externalId?: string | null;
}
