export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
  createdBy: string;
  createdAt: Date;
}
