// Entidade de dominio — sem dependencia de framework ou ORM.
export interface TripActivity {
  id: string;
  tripDestinationId: string;
  activityCatalogId: string;
  dateTime?: Date | null;
  durationMinutes?: number | null;
  expectedCost?: number | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
