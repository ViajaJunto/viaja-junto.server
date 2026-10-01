// Domain entity — no framework and no ORM dependency.
export interface User {
  id: string;
  name: string;
  email: string;
  /** Google account id. Null for accounts not yet linked to Google. */
  googleId: string | null;
  createdAt: Date;
}
