import { SwaggerModule } from '@nestjs/swagger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOpenApiConfig, createOpenApiDocument } from './openapi.js';

describe('buildOpenApiConfig', () => {
  const document = buildOpenApiConfig();

  it('carries the metadata Spectral requires', () => {
    expect(document.info.title).toBe('ViajaJunto API');
    expect(document.info.version).toBe('1.0.0');
    expect(document.info.contact).toBeDefined();
    expect(document.info.license).toBeDefined();
  });

  it('declares at least one server', () => {
    expect(document.servers?.length).toBeGreaterThan(0);
  });

  it('registers the bearer security scheme', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('documents pagination, auth, permissions and rate limits in the description', () => {
    for (const section of [
      'Authentication',
      'Permissions',
      'Pagination',
      'Rate limiting',
      'Errors',
    ]) {
      expect(document.info.description).toContain(`### ${section}`);
    }
  });
});

describe('createOpenApiDocument', () => {
  const document = {
    paths: {
      '/api/health': {
        get: { tags: ['Health'], responses: { '200': {} } },
      },
      '/api/trips': {
        get: { tags: ['Trips'], responses: { '200': {} } },
        post: {
          tags: ['Trips'],
          responses: { '201': {}, '429': { description: 'custom' } },
        },
      },
    },
  };

  beforeEach(() => {
    vi.spyOn(SwaggerModule, 'createDocument').mockReturnValue(
      structuredClone(document) as never,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('documents the rate limiter 429 on every limited operation', () => {
    const result = createOpenApiDocument({} as never);

    expect(result.paths['/api/trips'].get?.responses['429']).toMatchObject({
      headers: { 'Retry-After': expect.any(Object) },
    });
  });

  it('leaves the health check alone, which is not rate limited', () => {
    const result = createOpenApiDocument({} as never);

    expect(result.paths['/api/health'].get?.responses).not.toHaveProperty(
      '429',
    );
  });

  it('keeps a 429 an operation documents itself', () => {
    const result = createOpenApiDocument({} as never);

    expect(result.paths['/api/trips'].post?.responses['429']).toEqual({
      description: 'custom',
    });
  });
});
