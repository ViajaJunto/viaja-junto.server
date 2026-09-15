// Entidade de dominio — sem dependencia de framework ou ORM.
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
