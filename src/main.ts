import 'dotenv/config';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';
import { env } from './shared/config/env.js';

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

  const config = new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription(
      [
        'API REST da plataforma ViajaJunto — planejamento colaborativo de viagens.',
        '',
        '### Autenticacao',
        'Endpoints marcados com o cadeado exigem um JWT no header',
        '`Authorization: Bearer <token>`. Endpoints de leitura do catalogo',
        '(destinos, atividades e avaliacoes) sao publicos.',
        '',
        '### Paginacao',
        'As listagens aceitam `page` (default 1) e `limit` (default 20, maximo 100)',
        'e respondem no envelope `{ data, meta }`.',
        '',
        '### Erros',
        '`422` indica payload invalido e traz uma mensagem por regra violada.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
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
