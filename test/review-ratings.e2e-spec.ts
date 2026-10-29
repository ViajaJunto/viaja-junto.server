import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

type Account = { id: string; email: string };

describe('Review ratings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);

  let users: Account[];
  let activityId: string;
  let otherActivityId: string;

  const bearer = (user: Account) =>
    `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: user.id,
      email: user.email,
    })}`;

  const rating = async (id: string) =>
    prisma.activityCatalog.findUniqueOrThrow({
      where: { id },
      select: { averageRating: true, reviewCount: true },
    });

  const review = (user: Account, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', bearer(user))
      .send(body);

  const details = (id: string) =>
    request(app.getHttpServer()).get(`/api/activity-catalog/${id}/details`);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    users = await Promise.all(
      ['ana', 'bia', 'caio', 'dani'].map((name) =>
        prisma.user.create({
          data: { name: `${name} ${run}`, email: `${name}-${run}@example.com` },
        }),
      ),
    );
    activityId = (
      await prisma.activityCatalog.create({ data: { name: `Rated ${run}` } })
    ).id;
    otherActivityId = (
      await prisma.activityCatalog.create({ data: { name: `Other ${run}` } })
    ).id;
  });

  afterAll(async () => {
    await prisma.activityCatalog.deleteMany({
      where: { id: { in: [activityId, otherActivityId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await app.close();
  });

  it('starts with no rating', async () => {
    expect(await rating(activityId)).toEqual({
      averageRating: null,
      reviewCount: 0,
    });
  });

  it('updates the average and the count when reviews are created', async () => {
    await review(users[0], { activityId, rating: 5 }).expect(201);
    expect(await rating(activityId)).toEqual({
      averageRating: 5,
      reviewCount: 1,
    });

    await review(users[1], { activityId, rating: 4 }).expect(201);
    expect(await rating(activityId)).toEqual({
      averageRating: 4.5,
      reviewCount: 2,
    });

    await review(users[2], { activityId, rating: 4 }).expect(201);
    expect(await rating(activityId)).toEqual({
      averageRating: 4.33,
      reviewCount: 3,
    });
  });

  it('does not touch the rating of other activities', async () => {
    expect(await rating(otherActivityId)).toEqual({
      averageRating: null,
      reviewCount: 0,
    });
  });

  it('recomputes the average when a review is edited', async () => {
    const mine = await prisma.review.findFirstOrThrow({
      where: { activityId, userId: users[2].id },
    });

    await request(app.getHttpServer())
      .patch(`/api/reviews/${mine.id}`)
      .set('Authorization', bearer(users[2]))
      .send({ rating: 1 })
      .expect(200);

    expect(await rating(activityId)).toEqual({
      averageRating: 3.33,
      reviewCount: 3,
    });
  });

  it('recomputes the average and the count when a review is deleted', async () => {
    const mine = await prisma.review.findFirstOrThrow({
      where: { activityId, userId: users[2].id },
    });

    await request(app.getHttpServer())
      .delete(`/api/reviews/${mine.id}`)
      .set('Authorization', bearer(users[2]))
      .expect(204);

    expect(await rating(activityId)).toEqual({
      averageRating: 4.5,
      reviewCount: 2,
    });
  });

  it('keeps the rating when a review is rejected', async () => {
    await review(users[0], { activityId, rating: 1 }).expect(409);
    await review(users[3], { activityId, rating: 9 }).expect(422);

    expect(await rating(activityId)).toEqual({
      averageRating: 4.5,
      reviewCount: 2,
    });
  });

  it('shows the activity page publicly, with reviewers by name only', async () => {
    const { body } = await details(activityId).expect(200);

    expect(body).toMatchObject({
      id: activityId,
      averageRating: 4.5,
      reviewCount: 2,
    });
    expect(body.latestReviews).toHaveLength(2);
    expect(
      body.latestReviews.map((r: { rating: number }) => r.rating).sort(),
    ).toEqual([4, 5]);
    expect(body.latestReviews[0].authorName).toMatch(new RegExp(run));
    expect(JSON.stringify(body)).not.toContain('@example.com');
    expect(JSON.stringify(body)).not.toContain(users[0].id);
  });

  it('lists the newest review first and caps the page at ten', async () => {
    const crowd = await Promise.all(
      Array.from({ length: 11 }, (_, i) =>
        prisma.user.create({
          data: { name: `fan${i} ${run}`, email: `fan${i}-${run}@example.com` },
        }),
      ),
    );
    await prisma.review.createMany({
      data: crowd.map((fan, i) => ({
        userId: fan.id,
        activityId: otherActivityId,
        rating: 5,
        createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
      })),
    });

    const { body } = await details(otherActivityId).expect(200);

    expect(body.latestReviews).toHaveLength(10);
    expect(body.latestReviews[0].authorName).toBe(`fan10 ${run}`);
    expect(body.latestReviews[9].authorName).toBe(`fan1 ${run}`);

    await prisma.user.deleteMany({
      where: { id: { in: crowd.map((u) => u.id) } },
    });
  });

  it('answers 404 for an unknown activity page', async () => {
    await details(randomUUID()).expect(404);
  });

  it('stays consistent when many reviews arrive at once', async () => {
    const crowd = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        prisma.user.create({
          data: {
            name: `rush${i} ${run}`,
            email: `rush${i}-${run}@example.com`,
          },
        }),
      ),
    );
    const target = (
      await prisma.activityCatalog.create({ data: { name: `Rush ${run}` } })
    ).id;

    await Promise.all(
      crowd.map((fan, i) =>
        review(fan, { activityId: target, rating: (i % 5) + 1 }).expect(201),
      ),
    );

    const stored = await prisma.review.aggregate({
      where: { activityId: target },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const current = await rating(target);

    expect(current.reviewCount).toBe(8);
    expect(current.reviewCount).toBe(stored._count._all);
    expect(current.averageRating).toBeCloseTo(stored._avg.rating as number, 2);

    await prisma.activityCatalog.delete({ where: { id: target } });
    await prisma.user.deleteMany({
      where: { id: { in: crowd.map((u) => u.id) } },
    });
  });

  it('refreshes the rating when a reviewer deletes their account', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${users[1].id}`)
      .set('Authorization', bearer(users[1]))
      .expect(204);

    expect(await rating(activityId)).toEqual({
      averageRating: 5,
      reviewCount: 1,
    });
  });

  it('exposes the count in the plain catalog entry too', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/api/activity-catalog/${activityId}`)
      .expect(200);

    expect(body).toMatchObject({ averageRating: 5, reviewCount: 1 });
  });
});
