import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security.js';

/** Runs the middleware against a bare request and returns the headers it set. */
function headersFor(path: string, docsPath = 'docs') {
  const headers = new Map<string, string>();
  const res = {
    getHeader: (name: string) => headers.get(name.toLowerCase()),
    setHeader: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    },
    removeHeader: (name: string) => {
      headers.delete(name.toLowerCase());
    },
  } as unknown as Response;
  let called = false;

  securityHeaders(docsPath)({ path } as Request, res, (() => {
    called = true;
  }) as NextFunction);

  return { headers, called };
}

describe('securityHeaders', () => {
  it('hands the request on to the next handler', () => {
    expect(headersFor('/api/trips').called).toBe(true);
  });

  it('sets the standard protective headers on API routes', () => {
    const { headers } = headersFor('/api/trips');

    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(headers.get('strict-transport-security')).toContain('max-age=');
    expect(headers.get('referrer-policy')).toBe('no-referrer');
    expect(headers.has('x-powered-by')).toBe(false);
  });

  it('keeps a strict CSP on API routes: nothing is loaded from anywhere else', () => {
    const csp = headersFor('/api/trips').headers.get('content-security-policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('cdn.jsdelivr.net');
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it.each(['/docs', '/docs/', '/docs/anything'])(
    'lets the API reference load its script from jsDelivr on %s',
    (path) => {
      const csp = headersFor(path).headers.get('content-security-policy');

      expect(csp).toContain('script-src');
      expect(csp).toContain('https://cdn.jsdelivr.net');
    },
  );

  it('does not widen the CSP for a route that merely starts with the same letters', () => {
    const csp = headersFor('/documents').headers.get('content-security-policy');

    expect(csp).not.toContain('cdn.jsdelivr.net');
  });

  it('follows the configured docs path', () => {
    const custom = headersFor('/reference', 'reference').headers.get(
      'content-security-policy',
    );
    const old = headersFor('/docs', 'reference').headers.get(
      'content-security-policy',
    );

    expect(custom).toContain('cdn.jsdelivr.net');
    expect(old).not.toContain('cdn.jsdelivr.net');
  });

  it('still forbids plugins and framing by other sites on the docs page', () => {
    const csp = headersFor('/docs').headers.get('content-security-policy');

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
  });
});
