import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

describe('Top destinations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Unique city names, so the ranking of these rows is independent of other data.
  const tag = randomUUID()
    .replace(/[^a-f]/g, '')
    .slice(0, 8);
  const city = (name: string) => `${name}${tag}`;

  const ids: { destinations: string[]; activities: string[] } = {
    destinations: [],
    activities: [],
  };

  const destination = async (
    name: string,
    country: string | null = 'Brasil',
  ) => {
    const row = await prisma.destinationCatalog.create({
      data: { name: city(name), country },
    });
    ids.destinations.push(row.id);
    return row;
  };

  const activity = async (
    cityName: string,
    averageRating: number | null,
    reviewCount: number,
    country: string | null = 'Brasil',
  ) => {
    const row = await prisma.activityCatalog.create({
      data: {
        name: `Act ${cityName} ${ids.activities.length}`,
        city: city(cityName),
        country,
        averageRating,
        reviewCount,
      },
    });
    ids.activities.push(row.id);
  };

  const top = (query = '') =>
    request(app.getHttpServer()).get(`/api/destination-catalog/top${query}`);

  const mine = (body: { data?: unknown } | unknown[]) =>
    (body as { name: string; rating: number; reviewCount: number }[]).filter(
      (item) => item.name.endsWith(tag),
    );

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    await destination('Alpha');
    await destination('Beta');
    await destination('Gamma');
    await destination('Delta');
    await destination('Epsilon');
    await destination('Unrated');
    await destination('Abroad', 'Portugal');

    // Alpha: (5*1 + 4*3) / 4 = 4.25 over 4 reviews: weighted, not a plain mean of 4.5.
    await activity('Alpha', 5, 1);
    await activity('Alpha', 4, 3);
    // Beta: a single perfect review.
    await activity('Beta', 5, 1);
    // Gamma: 4.25 as well, but with more reviews, so it ranks above Alpha.
    await activity('Gamma', 4.25, 20);
    // Delta: an activity without reviews does not count.
    await activity('Delta', 3, 2);
    await activity('Delta', null, 0);
    // The city matches case-insensitively and with stray spaces.
    await prisma.activityCatalog
      .create({
        data: {
          name: `Act epsilon ${tag}`,
          city: ` ${city('Epsilon').toUpperCase()} `,
          country: 'brasil',
          averageRating: 2,
          reviewCount: 2,
        },
      })
      .then((row) => ids.activities.push(row.id));
    // Same city name but another country: not Abroad's activity.
    await activity('Abroad', 1, 5, 'Brasil');
    // Unrated: only an activity with no reviews.
    await activity('Unrated', null, 0);
  });

  afterAll(async () => {
    await prisma.activityCatalog.deleteMany({
      where: { id: { in: ids.activities } },
    });
    await prisma.destinationCatalog.deleteMany({
      where: { id: { in: ids.destinations } },
    });
    await app.close();
  });

  it('ranks by review-weighted rating, then by number of reviews', async () => {
    const { body } = await top('?limit=50').expect(200);

    expect(mine(body).map((d) => [d.name, d.rating, d.reviewCount])).toEqual([
      [city('Beta'), 5, 1],
      [city('Gamma'), 4.25, 20],
      [city('Alpha'), 4.25, 4],
      [city('Delta'), 3, 2],
      [city('Epsilon'), 2, 2],
    ]);
  });

  it('leaves out destinations without reviews and mismatched countries', async () => {
    const { body } = await top('?limit=50').expect(200);
    const names = mine(body).map((d) => d.name);

    expect(names).not.toContain(city('Unrated'));
    expect(names).not.toContain(city('Abroad'));
  });

  it('returns the destination fields along with the rating', async () => {
    const { body } = await top('?limit=50').expect(200);
    const beta = mine(body)[0];

    expect(beta).toMatchObject({
      name: city('Beta'),
      country: 'Brasil',
      rating: 5,
      reviewCount: 1,
    });
    expect(beta).toHaveProperty('id');
  });

  it('is public and respects the limit', async () => {
    const { body } = await top('?limit=2').expect(200);

    expect(body).toHaveLength(2);
  });

  it('defaults to ten destinations', async () => {
    const { body } = await top().expect(200);

    expect(body.length).toBeLessThanOrEqual(10);
  });

  it.each(['limit=0', 'limit=51', 'limit=abc'])(
    'rejects %s with 422',
    async (q) => {
      await top(`?${q}`).expect(422);
    },
  );

  it('is not mistaken for a destination id', async () => {
    await top().expect(200);
  });

  it('follows a new review: the rating changes with the activity', async () => {
    const [{ id }] = await prisma.activityCatalog.findMany({
      where: { city: city('Beta') },
    });
    await prisma.activityCatalog.update({
      where: { id },
      data: { averageRating: 3, reviewCount: 4 },
    });

    const { body } = await top('?limit=50').expect(200);

    expect(mine(body).find((d) => d.name === city('Beta'))).toMatchObject({
      rating: 3,
      reviewCount: 4,
    });
  });
});
