// Domain entity — no framework and no ORM dependency.
/** What ViajaJunto keeps from a Google profile after a successful sign-in. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}
