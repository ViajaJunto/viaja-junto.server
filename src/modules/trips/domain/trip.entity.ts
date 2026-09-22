// Domain entity — no framework and no ORM dependency.
export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
  createdBy: string;
  createdAt: Date;
}
