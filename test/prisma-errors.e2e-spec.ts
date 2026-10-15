import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';

describe('Prisma error mapping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  const bearer = (user: { id: string; email: string }) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  let owner: { id: string; email: string };
  let other: { id: string; email: string };
  let tripId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    owner = await prisma.user.create({
      data: { name: 'Owner', email: `owner-${run}@example.com` },
    });
    other = await prisma.user.create({
      data: { name: 'Other', email: `other-${run}@example.com` },
    });
    const trip = await prisma.trip.create({
      data: { name: `Trip ${run}`, createdBy: owner.id },
    });
    tripId = trip.id;
  });

  afterAll(async () => {
    await prisma.trip.deleteMany({ where: { createdBy: owner.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, other.id] } },
    });
    await app.close();
  });

  it('answers 409, not 500, when the email is already taken', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/users/${owner.id}`)
      .set('Authorization', bearer(owner))
      .send({ email: other.email })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
    });
    expect(response.body.message).toBe(
      'A User with these values already exists',
    );
  });

  it('answers 409 when the same member is added twice', async () => {
    const member = { tripId, userId: other.id, permission: 'VIEWER' };

    await request(app.getHttpServer())
      .post('/api/trip-members')
      .set('Authorization', bearer(owner))
      .send(member)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/trip-members')
      .set('Authorization', bearer(owner))
      .send(member)
      .expect(409);
  });

  it('answers 404 when a referenced record does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/trip-destinations')
      .set('Authorization', bearer(owner))
      .send({ tripId, destinationCatalogId: randomUUID() })
      .expect(404);

    expect(response.body.message).toBe('A referenced record does not exist');
  });

  it('answers 409 when deleting a user who still owns trips', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/users/${owner.id}`)
      .set('Authorization', bearer(owner))
      .expect(409);

    expect(response.body.message).toBe(
      'The record is still referenced by other records',
    );
  });
});
