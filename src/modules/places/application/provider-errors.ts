import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlacesProviderError } from '../domain/places.provider.js';

/** Turns what can go wrong with a provider into the HTTP answer it deserves. */
export function toHttpException(error: unknown): unknown {
  if (!(error instanceof PlacesProviderError)) return error;

  switch (error.failure) {
    case 'timeout':
      return new GatewayTimeoutException(error.message);
    case 'rate_limited':
      return new ServiceUnavailableException(error.message);
    default:
      return new BadGatewayException(error.message);
  }
}

/** Runs a provider call, throwing the HTTP exception for provider failures. */
export async function callProvider<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toHttpException(error);
  }
}
