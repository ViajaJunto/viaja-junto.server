// Domain entity — no framework and no ORM dependency.
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}
