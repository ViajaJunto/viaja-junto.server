export interface ActivityCatalog {
  id: string;
  name: string;
  description?: string;
  type: 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';
  location?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  photoUrl?: string;
  source?: string;
  averageRating?: number;
  createdAt: Date;
}
