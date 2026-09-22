// Domain entity — no framework and no ORM dependency.
export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  permission: 'EDITOR' | 'VIEWER';
  joinedAt: Date;
}
