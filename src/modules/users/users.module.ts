import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: UserRepository, useClass: UserPrismaRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
