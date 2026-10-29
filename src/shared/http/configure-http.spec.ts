import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { configureHttp } from './configure-http.js';

const fakeApp = () => {
  const calls: string[] = [];
  const app = {
    set: vi.fn((...args: unknown[]) => calls.push(`set:${args.join('=')}`)),
    use: vi.fn(() => calls.push('use')),
    setGlobalPrefix: vi.fn((prefix: string) => calls.push(`prefix:${prefix}`)),
    enableCors: vi.fn(() => calls.push('cors')),
    useGlobalPipes: vi.fn(() => calls.push('pipes')),
  };

  return { app: app as unknown as NestExpressApplication, mocks: app, calls };
};

describe('configureHttp', () => {
  const original = env.TRUST_PROXY_HOPS;

  afterEach(() => {
    env.TRUST_PROXY_HOPS = original;
  });

  it('applies the security headers first, then the prefix, CORS and validation', () => {
    const { app, calls } = fakeApp();

    configureHttp(app);

    expect(calls).toEqual(['use', `prefix:${env.API_PREFIX}`, 'cors', 'pipes']);
  });

  it('allows the configured origins', () => {
    const { app, mocks } = fakeApp();

    configureHttp(app);

    expect(mocks.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: env.CORS_ORIGINS }),
    );
  });

  it('does not trust any proxy by default', () => {
    const { app, mocks } = fakeApp();

    configureHttp(app);

    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('reads the client IP from X-Forwarded-For when proxies are in front', () => {
    env.TRUST_PROXY_HOPS = 2;
    const { app, calls } = fakeApp();

    configureHttp(app);

    expect(calls[0]).toBe('set:trust proxy=2');
  });
});
