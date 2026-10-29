import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

describe('Date rules (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let user: { id: string; email: string };
  let catalogId: string;
  let activityCatalogId: string;
  let tripId: string;
  let destinationId: string;

  const auth = () =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const send = (
    method: 'post' | 'patch',
    path: string,
    body: Record<string, unknown>,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', auth())
      .send(body);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    user = await prisma.user.create({
      data: { name: 'Dates', email: `dates-${run}@example.com` },
    });
    catalogId = (
      await prisma.destinationCatalog.create({ data: { name: `Rome ${run}` } })
    ).id;
    activityCatalogId = (
      await prisma.activityCatalog.create({ data: { name: `Tour ${run}` } })
    ).id;
    tripId = (
      await prisma.trip.create({
        data: {
          name: `Trip ${run}`,
          createdBy: user.id,
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-15'),
        },
      })
    ).id;
    destinationId = (
      await prisma.tripDestination.create({
        data: {
          tripId,
          destinationCatalogId: catalogId,
          arrival: new Date('2026-07-02'),
          departure: new Date('2026-07-05'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.trip.deleteMany({ where: { createdBy: user.id } });
    await prisma.activityCatalog.delete({ where: { id: activityCatalogId } });
    await prisma.destinationCatalog.delete({ where: { id: catalogId } });
    await prisma.user.delete({ where: { id: user.id } });
    await app.close();
  });

  describe('trips', () => {
    it('rejects an end date before the start date', async () => {
      const response = await send('post', '/trips', {
        name: 'Backwards',
        startDate: '2026-08-10',
        endDate: '2026-08-01',
      }).expect(422);

      expect(response.body.message).toEqual([
        'endDate must not be earlier than startDate',
      ]);
    });

    it('rejects an update that would invert the stored dates', async () => {
      await send('patch', `/trips/${tripId}`, { endDate: '2026-06-01' }).expect(
        422,
      );
    });

    it('accepts a one-day trip', async () => {
      await send('post', '/trips', {
        name: `One day ${run}`,
        startDate: '2026-08-01',
        endDate: '2026-08-01',
      }).expect(201);
    });
  });

  describe('destinations', () => {
    it('rejects a departure before the arrival', async () => {
      await send('post', '/trip-destinations', {
        tripId,
        destinationCatalogId: catalogId,
        arrival: '2026-07-10',
        departure: '2026-07-09',
      }).expect(422);
    });

    it('rejects dates outside the trip', async () => {
      const response = await send('post', '/trip-destinations', {
        tripId,
        destinationCatalogId: catalogId,
        arrival: '2026-06-20',
        departure: '2026-07-03',
      }).expect(422);

      expect(response.body.message).toEqual([
        'arrival must be within the trip dates (2026-07-01 to 2026-07-15)',
      ]);
    });

    it('accepts a stay inside the trip', async () => {
      await send('post', '/trip-destinations', {
        tripId,
        destinationCatalogId: catalogId,
        arrival: '2026-07-06',
        departure: '2026-07-08',
      }).expect(201);
    });

    it('rejects an update that moves the arrival past the stored departure', async () => {
      await send('patch', `/trip-destinations/${destinationId}`, {
        arrival: '2026-07-09',
      }).expect(422);
    });
  });

  describe('activities', () => {
    const activity = (dateTime: string) => ({
      tripDestinationId: destinationId,
      activityCatalogId,
      dateTime,
    });

    it('rejects an activity before the arrival', async () => {
      const response = await send(
        'post',
        '/trip-activities',
        activity('2026-07-01T10:00:00Z'),
      ).expect(422);

      expect(response.body.message).toEqual([
        'dateTime must be within the destination stay (2026-07-02 to 2026-07-05)',
      ]);
    });

    it('accepts an activity on the departure day', async () => {
      await send(
        'post',
        '/trip-activities',
        activity('2026-07-05T21:30:00Z'),
      ).expect(201);
    });

    it('rejects an update that moves the activity out of the stay', async () => {
      const created = await send(
        'post',
        '/trip-activities',
        activity('2026-07-03T10:00:00Z'),
      ).expect(201);

      await send('patch', `/trip-activities/${created.body.id}`, {
        dateTime: '2026-07-20T10:00:00Z',
      }).expect(422);
    });
  });
});
