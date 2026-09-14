export interface DestinationCatalog {
  id: string;
  name: string;
  country?: string;
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL';
  description?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
}
