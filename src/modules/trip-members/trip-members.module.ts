import { Module } from '@nestjs/common';
import { TripMembersService } from './application/trip-members.service.js';
import { TripMemberRepository } from './domain/trip-member.repository.js';
import { TripMemberPrismaRepository } from './infrastructure/trip-member.prisma.repository.js';
import { TripMembersController } from './presentation/trip-members.controller.js';

@Module({
  controllers: [TripMembersController],
  providers: [
    TripMembersService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: TripMemberRepository, useClass: TripMemberPrismaRepository },
  ],
  exports: [TripMembersService],
})
export class TripMembersModule {}
