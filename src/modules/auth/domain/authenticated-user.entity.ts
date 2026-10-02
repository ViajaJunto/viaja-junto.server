// Domain entity — no framework and no ORM dependency.
/** The caller behind a valid access token, attached to `request.user`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
