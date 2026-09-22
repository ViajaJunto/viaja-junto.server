import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: UserRepository, useClass: UserPrismaRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
