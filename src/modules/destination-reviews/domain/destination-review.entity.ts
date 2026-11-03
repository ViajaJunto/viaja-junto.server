// Domain entity — no framework and no ORM dependency.
export interface DestinationReview {
  id: string;
  userId: string;
  destinationId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}
