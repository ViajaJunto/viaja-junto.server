import { HttpStatus, ValidationPipe } from '@nestjs/common';

/**
 * The global ValidationPipe, shared by the bootstrap (src/main.ts) and the e2e
 * suite so tests exercise the exact validation the running API applies.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    // Strip any property that is not declared on the DTO.
    whitelist: true,
    // An unknown property is not silently dropped: it becomes an error.
    forbidNonWhitelisted: true,
    // Instantiate the DTO for real, applying @Type() (query string -> number).
    transform: true,
    // 422 separates "invalid payload" from "malformed request" (400).
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
}
