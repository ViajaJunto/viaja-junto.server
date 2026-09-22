// Domain entity — no framework and no ORM dependency.
export interface Budget {
  id: string;
  tripId: string;
  totalValue: number;
  plannedActivities: number;
  createdAt: Date;
}
