import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns a static string confirming that the API process is running. ' +
      'It does not check the database connection, so a successful response ' +
      'does not by itself mean the API can serve data.',
  })
  @ApiOkResponse({
    description: 'The API process is up.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
