import { describe, expect, it } from 'vitest';
import { buildOpenApiConfig } from './openapi.js';

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

  it('documents pagination and auth in the description', () => {
    expect(document.info.description).toContain('Pagination');
    expect(document.info.description).toContain('Authentication');
  });
});
