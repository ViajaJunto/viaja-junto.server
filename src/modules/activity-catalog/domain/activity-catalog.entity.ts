// Domain entity — no framework and no ORM dependency.
/** A review as shown on the public activity page: the author is just a name. */
export interface ActivityReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  authorName: string;
}

export interface ActivityCatalog {
  id: string;
  name: string;
  description?: string | null;
  type: 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';
  location?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  photoUrl?: string | null;
  /** Id in the external places provider (`osm:node:123`) when imported. */
  externalId?: string | null;
  source?: string | null;
  /** The destination (city) the activity is in, when the catalog knows it. */
  destinationCatalogId?: string | null;
  /** Derived from the reviews; never set through the API. */
  averageRating?: number | null;
  /** How many reviews the average is based on. */
  reviewCount: number;
  createdAt: Date;
}
