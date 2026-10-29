// Domain entity — no framework and no ORM dependency.
/** How the caller relates to a trip: its creator, or an invited member. */
export type TripRole = 'OWNER' | 'EDITOR' | 'VIEWER';

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

/** A trip as seen by one user, with the role they hold on it. */
export interface UserTrip extends Trip {
  role: TripRole;
}
