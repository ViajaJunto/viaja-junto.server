import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ActivityCatalogController } from '../../modules/activity-catalog/presentation/activity-catalog.controller.js';
import { AuthController } from '../../modules/auth/presentation/auth.controller.js';
import { GoogleAuthGuard } from '../../modules/auth/presentation/guards/google-auth.guard.js';
import { JwtAuthGuard } from '../../modules/auth/presentation/guards/jwt-auth.guard.js';
import { BudgetsController } from '../../modules/budgets/presentation/budgets.controller.js';
import { DestinationCatalogController } from '../../modules/destination-catalog/presentation/destination-catalog.controller.js';
import { ReviewsController } from '../../modules/reviews/presentation/reviews.controller.js';
import { TripActivitiesController } from '../../modules/trip-activities/presentation/trip-activities.controller.js';
import { TripDestinationsController } from '../../modules/trip-destinations/presentation/trip-destinations.controller.js';
import { TripMembersController } from '../../modules/trip-members/presentation/trip-members.controller.js';
import { TripsController } from '../../modules/trips/presentation/trips.controller.js';
import { UsersController } from '../../modules/users/presentation/users.controller.js';

type Controller = new (...args: never[]) => object;

const controllers: Controller[] = [
  ActivityCatalogController,
  AuthController,
  BudgetsController,
  DestinationCatalogController,
  ReviewsController,
  TripActivitiesController,
  TripDestinationsController,
  TripMembersController,
  TripsController,
  UsersController,
];

/** Routes that stay open to visitors (docs/architecture.md §5.6). */
const PUBLIC = new Set([
  'AuthController.googleSignIn',
  'AuthController.googleCallback',
  'DestinationCatalogController.findAll',
  'DestinationCatalogController.findOne',
  'ActivityCatalogController.findAll',
  'ActivityCatalogController.findOne',
  'ReviewsController.findAll',
  'ReviewsController.findOne',
]);

function routes(controller: Controller) {
  const proto = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .filter((name) => Reflect.hasMetadata(PATH_METADATA, proto[name] as object))
    .map((name) => {
      const handler = proto[name] as object;
      const guards: unknown[] = [
        ...(Reflect.getMetadata(GUARDS_METADATA, controller) ?? []),
        ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? []),
      ];
      return {
        id: `${controller.name}.${name}`,
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)],
        guards,
      };
    });
}

describe('route protection', () => {
  const all = controllers.flatMap(routes);

  it('discovers the routes of every controller', () => {
    expect(all.length).toBeGreaterThan(40);
  });

  it.each(all.filter((route) => !PUBLIC.has(route.id)))(
    '$method $id requires a valid access token',
    ({ guards }) => {
      expect(guards).toContain(JwtAuthGuard);
    },
  );

  it.each(all.filter((route) => PUBLIC.has(route.id)))(
    '$id is public',
    ({ guards }) => {
      expect(guards).not.toContain(JwtAuthGuard);
    },
  );

  it('never leaves a public route that is not on the allowlist unguarded', () => {
    const unguarded = all
      .filter(
        (route) =>
          !route.guards.includes(JwtAuthGuard) &&
          !route.guards.includes(GoogleAuthGuard),
      )
      .map((route) => route.id)
      .filter((id) => !PUBLIC.has(id));

    expect(unguarded).toEqual([]);
  });
});
