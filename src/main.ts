import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT ?? 3000);
  const apiPrefix = process.env.API_PREFIX ?? 'api';

  app.setGlobalPrefix(apiPrefix);

  const config = new DocumentBuilder()
    .setTitle('ViajaJunto API')
    .setDescription('API documentation for the ViajaJunto platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  app.use(
    `/${process.env.SWAGGER_PATH ?? 'docs'}`,
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  await app.listen(port);
}

await bootstrap();
