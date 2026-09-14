export interface Review {
  id: string;
  userId: string;
  activityId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}
