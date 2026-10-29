import { ServiceUnavailableException } from '@nestjs/common';
import { PlacesProvider } from '../domain/places.provider.js';

/**
 * Stand-in used when PLACES_USER_AGENT is not set. The rest of the API keeps
 * working; the places endpoints answer 503 and say what is missing.
 */
export class UnconfiguredPlacesProvider implements PlacesProvider {
  search(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  lookup(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'The places service is not configured (set PLACES_USER_AGENT)',
    );
  }
}
