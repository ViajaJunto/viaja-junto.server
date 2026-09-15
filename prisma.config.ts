import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuracao do Prisma CLI (generate, migrate, studio).
 *
 * A partir do Prisma 7 a URL de conexao nao fica mais no schema.prisma:
 * o CLI le daqui, e o runtime recebe a conexao via driver adapter
 * (ver src/shared/database/prisma.service.ts).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
