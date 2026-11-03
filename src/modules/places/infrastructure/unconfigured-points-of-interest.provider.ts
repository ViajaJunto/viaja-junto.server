import { ServiceUnavailableException } from '@nestjs/common';
import { PointsOfInterestProvider } from '../domain/points-of-interest.provider.js';

/** Stand-in used when GOOGLE_PLACES_API_KEY is not set. */
export class UnconfiguredPointsOfInterestProvider implements PointsOfInterestProvider {
  findNear(): Promise<never> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Finding activities is not configured (set GOOGLE_PLACES_API_KEY)',
      ),
    );
  }
}
