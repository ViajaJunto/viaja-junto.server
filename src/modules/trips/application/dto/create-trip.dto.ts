export class CreateTripDto {
  name!: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
  createdBy!: string;
}
