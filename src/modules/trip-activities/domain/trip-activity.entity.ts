// Domain entity — no framework and no ORM dependency.
export interface TripActivity {
  id: string;
  tripDestinationId: string;
  activityCatalogId: string;
  dateTime?: Date | null;
  durationMinutes?: number | null;
  expectedCost?: number | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
