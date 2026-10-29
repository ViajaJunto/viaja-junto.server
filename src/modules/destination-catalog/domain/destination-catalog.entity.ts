// Domain entity — no framework and no ORM dependency.
export interface DestinationCatalog {
  id: string;
  name: string;
  country?: string | null;
  /** ISO 3166-1 alpha-2 code of the country, upper-case. */
  countryCode?: string | null;
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL' | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrl?: string | null;
}
