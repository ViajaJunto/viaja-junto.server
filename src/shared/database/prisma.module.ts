import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Global: os repositorios de qualquer modulo podem injetar o PrismaService
 * sem precisar importar este modulo explicitamente.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
