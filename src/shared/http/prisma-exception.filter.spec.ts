import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mapPrismaError,
  PrismaExceptionFilter,
} from './prisma-exception.filter.js';

const known = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('boom', {
    code,
    clientVersion: 'test',
    meta,
  });

describe('mapPrismaError', () => {
  it('maps a unique violation to 409 and names the fields', () => {
    expect(mapPrismaError('P2002', { target: ['email'] }, 'POST')).toEqual({
      status: 409,
      message: 'A record with this email already exists',
    });
  });

  it('names the model when the driver does not report the columns', () => {
    expect(
      mapPrismaError('P2002', { modelName: 'TripMember' }, 'POST')?.message,
    ).toBe('A TripMember with these values already exists');
  });

  it('falls back to a generic message when the fields are unknown', () => {
    expect(mapPrismaError('P2002', undefined, 'POST')).toEqual({
      status: 409,
      message: 'A record with these values already exists',
    });
  });

  it.each(['POST', 'PATCH', 'PUT'])(
    'maps a foreign key violation on %s to 404',
    (method) => {
      expect(mapPrismaError('P2003', undefined, method)?.status).toBe(404);
    },
  );

  it('maps a foreign key violation on DELETE to 409', () => {
    expect(mapPrismaError('P2003', undefined, 'DELETE')).toEqual({
      status: 409,
      message: 'The record is still referenced by other records',
    });
  });

  it('maps a missing record to 404', () => {
    expect(mapPrismaError('P2025', undefined, 'PATCH')?.status).toBe(404);
  });

  it('leaves other codes unmapped', () => {
    expect(mapPrismaError('P2024', undefined, 'GET')).toBeNull();
  });
});

describe('PrismaExceptionFilter', () => {
  let json: ReturnType<typeof vi.fn>;
  let status: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;
  const filter = new PrismaExceptionFilter();

  const hostFor = (method: string) => {
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getRequest: () => ({ method }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => hostFor('POST'));

  it('answers 409 with the standard error body', () => {
    filter.catch(known('P2002', { target: ['email'] }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'A record with this email already exists',
      error: 'Conflict',
    });
  });

  it('answers 404 with a readable status name', () => {
    filter.catch(known('P2025'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, error: 'Not Found' }),
    );
  });

  it('uses the request method to tell a missing parent from a referenced row', () => {
    hostFor('DELETE');

    filter.catch(known('P2003'), host);

    expect(status).toHaveBeenCalledWith(409);
  });

  it('keeps unmapped Prisma errors as an opaque 500', () => {
    filter.catch(known('P2024'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    });
  });
});
