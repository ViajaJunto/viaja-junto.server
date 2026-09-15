// Entidade de dominio — sem dependencia de framework ou ORM.
export interface Review {
  id: string;
  userId: string;
  activityId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}
