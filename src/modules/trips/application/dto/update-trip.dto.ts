export class UpdateTripDto {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
}
