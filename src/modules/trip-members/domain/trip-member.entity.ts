// Entidade de dominio — sem dependencia de framework ou ORM.
export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  permission: 'EDITOR' | 'VIEWER';
  joinedAt: Date;
}
