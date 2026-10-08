import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TripAccessRepository,
  type TripRole,
} from '../domain/trip-access.repository.js';

/**
 * Trip-level authorization policy (FR19, BR02-BR06).
 *
 * | Action                               | Creator | Editor | Viewer |
 * | ------------------------------------ | :-----: | :----: | :----: |
 * | Read the trip and everything in it   |    ✔    |   ✔    |   ✔   |
 * | Change destinations/activities/budget|    ✔    |   ✔    |        |
 * | Edit/delete the trip, manage members |    ✔    |        |        |
 *
 * A caller with no relationship to the trip gets the same 404 as a missing
 * trip, so the API does not reveal which trip ids exist. A caller who can see
 * the trip but lacks the permission gets 403.
 */
@Injectable()
export class TripAccessService {
  constructor(private readonly repository: TripAccessRepository) {}

  /** Any creator, editor or viewer. */
  assertCanRead(tripId: string, userId: string): Promise<TripRole> {
    return this.resolveRole(tripId, userId);
  }

  /** Creator or editor: may change destinations, activities and the budget. */
  async assertCanEdit(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.resolveRole(tripId, userId);

    if (role === 'VIEWER') {
      throw new ForbiddenException(
        'Viewers have read-only access to this trip',
      );
    }

    return role;
  }

  /** Creator only: edits or deletes the trip and manages its members. */
  async assertIsCreator(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.resolveRole(tripId, userId);

    if (role !== 'CREATOR') {
      throw new ForbiddenException('Only the trip creator can do this');
    }

    return role;
  }

  async tripIdOfDestination(tripDestinationId: string): Promise<string> {
    const tripId =
      await this.repository.findTripIdByDestination(tripDestinationId);

    if (!tripId) {
      throw new NotFoundException(
        `TripDestination with id "${tripDestinationId}" not found`,
      );
    }

    return tripId;
  }

  async tripIdOfActivity(tripActivityId: string): Promise<string> {
    const tripId = await this.repository.findTripIdByActivity(tripActivityId);

    if (!tripId) {
      throw new NotFoundException(
        `TripActivity with id "${tripActivityId}" not found`,
      );
    }

    return tripId;
  }

  private async resolveRole(tripId: string, userId: string): Promise<TripRole> {
    const role = await this.repository.findRole(tripId, userId);

    if (!role) {
      throw new NotFoundException(`Trip with id "${tripId}" not found`);
    }

    return role;
  }
}
