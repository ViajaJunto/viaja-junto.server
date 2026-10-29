// Domain entity — no framework and no ORM dependency.
export interface Budget {
  id: string;
  tripId: string;
  totalValue: number;
  plannedActivities: number;
  /** The currency of the trip the budget belongs to (read-only). */
  currency: string;
  createdAt: Date;
}
