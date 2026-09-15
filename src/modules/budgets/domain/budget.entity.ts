// Entidade de dominio — sem dependencia de framework ou ORM.
export interface Budget {
  id: string;
  tripId: string;
  totalValue: number;
  plannedActivities: number;
  createdAt: Date;
}
