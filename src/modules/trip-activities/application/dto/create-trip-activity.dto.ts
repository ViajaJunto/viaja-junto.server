export class CreateTripActivityDto {
  tripDestinationId!: string;
  activityCatalogId!: string;
  dateTime?: Date;
  durationMinutes?: number;
  expectedCost?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
