import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseHealthIndicator } from '../infrastructure/database.health-indicator.js';

/**
 * Health check for Docker, ECS and load balancers. Public and exempt from rate
 * limiting: probes call it every few seconds and must never be throttled.
 */
@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Health check',
    description:
      'Confirms the API process is up **and** can reach the database. Answers 200 when everything is up and 503 when the database does not answer, so a container or load balancer can stop sending traffic. Public.',
  })
  @ApiOkResponse({
    description: 'The API and the database are up.',
    schema: {
      type: 'object',
      example: {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'The database does not answer.',
    schema: {
      type: 'object',
      example: {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'The database did not answer' },
        },
        details: {
          database: { status: 'down', message: 'The database did not answer' },
        },
      },
    },
  })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.database.check('database')]);
  }
}
