// Domain entity — no framework and no ORM dependency.
export interface Review {
  id: string;
  userId: string;
  activityId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}
