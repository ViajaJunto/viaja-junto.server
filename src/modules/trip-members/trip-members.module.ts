import { Module } from '@nestjs/common';
import { TripMembersController } from './controller/trip-members.controller.js';
import { TripMembersService } from './service/trip-members.service.js';

@Module({
  controllers: [TripMembersController],
  providers: [TripMembersService],
  exports: [TripMembersService],
})
export class TripMembersModule {}
