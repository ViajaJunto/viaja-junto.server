import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmitterTripEventPublisher } from './emitter-trip-event-publisher.js';
import { TripEventPublisher } from './trip-events.js';

/**
 * Global, like PrismaModule: any service can announce a trip change without
 * importing anything, and the notifications module listens to them.
 */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    { provide: TripEventPublisher, useClass: EmitterTripEventPublisher },
  ],
  exports: [TripEventPublisher],
})
export class TripEventsModule {}
