import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface MappedError {
  status: HttpStatus;
  message: string;
}

/**
 * Translates the Prisma errors a client can cause into the HTTP answer it
 * deserves, instead of the generic 500:
 *
 * | Code    | Meaning                          | Answer                                  |
 * | ------- | -------------------------------- | --------------------------------------- |
 * | `P2002` | Unique constraint violated       | 409                                     |
 * | `P2003` | Foreign key violated             | 404 on write (the parent does not exist), 409 on DELETE (still referenced) |
 * | `P2025` | Record to update/delete missing  | 404                                     |
 *
 * Every other Prisma error is a server fault and stays a 500.
 */
export function mapPrismaError(
  code: string,
  meta: Record<string, unknown> | undefined,
  method: string,
): MappedError | null {
  switch (code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: duplicateMessage(meta),
      };
    case 'P2003':
      return method === 'DELETE'
        ? {
            status: HttpStatus.CONFLICT,
            message: 'The record is still referenced by other records',
          }
        : {
            status: HttpStatus.NOT_FOUND,
            message: 'A referenced record does not exist',
          };
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
    default:
      return null;
  }
}

function duplicateMessage(meta: Record<string, unknown> | undefined): string {
  const target = meta?.target;
  if (Array.isArray(target) && target.length > 0) {
    return `A record with this ${target.join(', ')} already exists`;
  }

  // Driver adapters (PrismaPg) do not report the columns, only the model.
  const model = meta?.modelName;

  return typeof model === 'string'
    ? `A ${model} with these values already exists`
    : 'A record with these values already exists';
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const mapped = mapPrismaError(
      exception.code,
      exception.meta,
      request.method,
    );

    if (!mapped) {
      this.logger.error(`${exception.code}: ${exception.message}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
      return;
    }

    response.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      error: HttpStatus[mapped.status]
        .toLowerCase()
        .split('_')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' '),
    });
  }
}
