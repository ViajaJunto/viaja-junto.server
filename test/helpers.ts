import { randomInt } from 'node:crypto';
import { generateInviteCode } from './../src/modules/trips/domain/invite-code.js';

/** A fresh invite code for trips the e2e specs insert straight into the database. */
export const inviteCode = (): string => generateInviteCode(randomInt);
