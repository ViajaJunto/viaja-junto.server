export class CreateDestinationCatalogDto {
  name!: string;
  country?: string;
  category?: 'CITY' | 'BEACH' | 'NATURE' | 'CULTURAL';
  description?: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
}
