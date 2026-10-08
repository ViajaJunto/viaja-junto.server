import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { TripMembersService } from './application/trip-members.service.js';
import { TripMemberRepository } from './domain/trip-member.repository.js';
import { TripMemberPrismaRepository } from './infrastructure/trip-member.prisma.repository.js';
import { TripMembersController } from './presentation/trip-members.controller.js';

@Module({
  imports: [TripAccessModule],
  controllers: [TripMembersController],
  providers: [
    TripMembersService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: TripMemberRepository, useClass: TripMemberPrismaRepository },
  ],
  exports: [TripMembersService],
})
export class TripMembersModule {}
