// Domain entity — no framework and no ORM dependency.
/** A review as shown on the public destination page: the author is just a name. */
export interface DestinationReviewSummary {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  authorName: string;
}

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
  /** Id in the external places provider (`osm:node:123`) when imported. */
  externalId?: string | null;
  /** Derived from the destination's own reviews; never set through the API. */
  averageRating?: number | null;
  /** How many reviews the average is based on. */
  reviewCount: number;
}
