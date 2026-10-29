import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';
import { env } from './shared/config/env.js';
import { buildCorsOptions } from './shared/http/cors.js';
import { buildOpenApiConfig } from './shared/http/openapi.js';
import { buildValidationPipe } from './shared/http/validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(env.API_PREFIX);
  app.enableCors(buildCorsOptions(env.CORS_ORIGINS));

  app.useGlobalPipes(buildValidationPipe());

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
