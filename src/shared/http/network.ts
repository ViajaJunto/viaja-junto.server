import net from 'node:net';

/**
 * How long Node waits for one address before trying the next one. The default
 * (250 ms) is shorter than the round trip to servers on another continent, so
 * every attempt was abandoned and outgoing calls (OpenStreetMap) failed with
 * ETIMEDOUT while `curl` worked. Hosts also publish IPv6 addresses that a
 * network without IPv6 refuses at once, which makes the next attempt start
 * quickly anyway.
 */
export const CONNECT_ATTEMPT_TIMEOUT_MS = 2000;

export function allowSlowConnectAttempts(): void {
  net.setDefaultAutoSelectFamilyAttemptTimeout(CONNECT_ATTEMPT_TIMEOUT_MS);
}
