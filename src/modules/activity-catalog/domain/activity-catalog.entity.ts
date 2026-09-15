// Entidade de dominio — sem dependencia de framework ou ORM.
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
  source?: string | null;
  averageRating?: number | null;
  createdAt: Date;
}
