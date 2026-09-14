export interface TripActivity {
  id: string;
  tripDestinationId: string;
  activityCatalogId: string;
  dateTime?: Date;
  durationMinutes?: number;
  expectedCost?: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
