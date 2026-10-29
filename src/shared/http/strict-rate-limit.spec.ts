import { describe, expect, it } from 'vitest';
import { ActivityCatalogController } from '../../modules/activity-catalog/presentation/activity-catalog.controller.js';
import { AuthController } from '../../modules/auth/presentation/auth.controller.js';
import { DestinationCatalogController } from '../../modules/destination-catalog/presentation/destination-catalog.controller.js';
import { HealthController } from '../../modules/health/presentation/health.controller.js';
import { ReviewsController } from '../../modules/reviews/presentation/reviews.controller.js';
import { TripInviteController } from '../../modules/trips/presentation/trip-invite.controller.js';
import { env } from '../config/env.js';

type Constructor = new (...args: never[]) => object;

/** What `@Throttle`/`@SkipThrottle` stored on a handler or a controller. */
const limitOf = (target: object) =>
  Reflect.getMetadata('THROTTLER:LIMITdefault', target) as number | undefined;
const skipped = (target: object) =>
  Reflect.getMetadata('THROTTLER:SKIPdefault', target) as boolean | undefined;
const handler = (controller: Constructor, name: string) =>
  (controller.prototype as Record<string, object>)[name];

describe('strict rate limits', () => {
  it.each([
    [AuthController, 'googleSignIn'],
    [AuthController, 'googleCallback'],
    [TripInviteController, 'join'],
    [ReviewsController, 'create'],
    [ActivityCatalogController, 'updatePhoto'],
    [DestinationCatalogController, 'updatePhoto'],
  ] as const)('%o.%s allows only the strict budget', (controller, name) => {
    expect(limitOf(handler(controller, name))).toBe(env.THROTTLE_STRICT_LIMIT);
  });

  it('leaves ordinary routes on the default budget', () => {
    expect(limitOf(handler(AuthController, 'me'))).toBeUndefined();
    expect(limitOf(handler(ReviewsController, 'findAll'))).toBeUndefined();
  });

  it('never throttles the health check, which probes call every few seconds', () => {
    expect(skipped(HealthController)).toBe(true);
  });
});
