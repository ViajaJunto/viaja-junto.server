import { Module } from '@nestjs/common';
import { UsersController } from './controller/users.controller.js';
import { UsersService } from './service/users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
