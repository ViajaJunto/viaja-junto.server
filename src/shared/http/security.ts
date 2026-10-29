import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Security headers for the API (`helmet`'s defaults, which include a strict
 * `Content-Security-Policy`: the API only answers JSON, it loads nothing).
 *
 * The API reference page is the exception. Scalar renders from a script on
 * jsDelivr and styles itself inline, so under `docsPath` the policy allows
 * exactly that and nothing more; every other route keeps the strict one.
 */
export function securityHeaders(docsPath: string) {
  const api = helmet();

  const docs = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        // The "Try it" console calls the API itself.
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  });
  const prefix = `/${docsPath.replace(/^\/+|\/+$/g, '')}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const isDocs = req.path === prefix || req.path.startsWith(`${prefix}/`);

    (isDocs ? docs : api)(req, res, next);
  };
}
