import { ServiceUnavailableException } from '@nestjs/common';
import { PointsOfInterestProvider } from '../domain/points-of-interest.provider.js';

/** Stand-in used when PLACES_USER_AGENT is not set. */
export class UnconfiguredPointsOfInterestProvider implements PointsOfInterestProvider {
  findNear(): Promise<never> {
    return Promise.reject(
      new ServiceUnavailableException(
        'The places service is not configured (set PLACES_USER_AGENT)',
      ),
    );
  }
}
