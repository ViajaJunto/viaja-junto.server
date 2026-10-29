import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsService } from './application/notifications.service.js';
import { NotificationRepository } from './domain/notification.repository.js';
import { NotificationPrismaRepository } from './infrastructure/notification.prisma.repository.js';
import { TripEventListener } from './infrastructure/trip-event.listener.js';
import { NotificationsController } from './presentation/notifications.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    TripEventListener,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: NotificationRepository, useClass: NotificationPrismaRepository },
  ],
})
export class NotificationsModule {}
