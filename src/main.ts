import 'dotenv/config';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';
import { env } from './shared/config/env.js';
import { buildOpenApiConfig } from './shared/http/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(env.API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any property that is not declared on the DTO.
      whitelist: true,
      // An unknown property is not silently dropped: it becomes an error.
      forbidNonWhitelisted: true,
      // Instantiate the DTO for real, applying @Type() (query string -> number).
      transform: true,
      // 422 separates "invalid payload" from "malformed request" (400).
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());

  app.use(
    `/${env.SWAGGER_PATH}`,
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  await app.listen(env.PORT);
}

await bootstrap();
