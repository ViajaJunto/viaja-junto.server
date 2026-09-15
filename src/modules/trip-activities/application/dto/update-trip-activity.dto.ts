export class UpdateTripActivityDto {
  dateTime?: Date;
  durationMinutes?: number;
  expectedCost?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
}
