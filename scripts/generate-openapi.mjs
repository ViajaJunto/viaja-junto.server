/**
 * Exports the OpenAPI document to a file so it can be linted in CI.
 *
 * The document is produced from the real AppModule — the same decorators the
 * running API uses — with PrismaService replaced by a stub, so no database is
 * needed. Run `npm run build` first: this reads from dist/.
 *
 * Usage: node scripts/generate-openapi.mjs [output-path]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// env.ts validates the environment at import time; nothing here connects.
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/viajajunto?schema=public';

const { Test } = await import('@nestjs/testing');
const { SwaggerModule } = await import('@nestjs/swagger');
const { AppModule } = await import('../dist/app.module.js');
const { PrismaService } = await import('../dist/shared/database/prisma.service.js');
const { buildOpenApiConfig } = await import('../dist/shared/http/openapi.js');

const output = resolve(process.argv[2] ?? 'openapi.json');

const prismaStub = {
  $connect: async () => {},
  $disconnect: async () => {},
};

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaService)
  .useValue(prismaStub)
  .compile();

const app = moduleRef.createNestApplication({ logger: false });
await app.init();

const document = SwaggerModule.createDocument(app, buildOpenApiConfig());

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);

await app.close();

console.log(
  `OpenAPI written to ${output} — ${Object.keys(document.paths).length} paths, ` +
    `${Object.keys(document.components?.schemas ?? {}).length} schemas`,
);
