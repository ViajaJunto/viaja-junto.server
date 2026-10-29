import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/shared/database/prisma.service.js';
import { buildValidationPipe } from './../src/shared/http/validation.js';

describe('Catalog search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Letters only: `q` is a substring match, so the tag must be unique to this run.
  const tag = `zq${randomUUID()
    .replace(/[^a-f]/g, '')
    .slice(0, 8)}`;

  const names = (body: { data: { name: string }[] }) =>
    body.data.map((item) => item.name);

  const get = (path: string) => request(app.getHttpServer()).get(`/api${path}`);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(buildValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.destinationCatalog.createMany({
      data: [
        {
          name: `Paris ${tag}`,
          country: 'França',
          countryCode: 'FR',
          category: 'CITY',
        },
        {
          name: `Nice ${tag}`,
          country: 'França',
          countryCode: 'FR',
          category: 'BEACH',
        },
        {
          name: `Porto ${tag}`,
          country: 'Portugal',
          countryCode: 'PT',
          category: 'CITY',
        },
        { name: `100% ${tag}`, country: 'Nowhere', category: 'NATURE' },
      ],
    });
    await prisma.activityCatalog.createMany({
      data: [
        {
          name: `Louvre ${tag}`,
          type: 'TOUR',
          city: 'Paris',
          country: 'França',
          averageRating: 4.8,
        },
        {
          name: `Bistrô ${tag}`,
          type: 'FOOD',
          city: 'Paris',
          country: 'França',
          averageRating: 3.9,
        },
        {
          name: `Cais ${tag}`,
          type: 'FOOD',
          city: 'Porto',
          country: 'Portugal',
          averageRating: null,
        },
        {
          name: `Aqueduto ${tag}`,
          type: 'TOUR',
          city: 'Lisboa',
          country: 'Portugal',
          averageRating: 4.1,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.destinationCatalog.deleteMany({
      where: { name: { contains: tag } },
    });
    await prisma.activityCatalog.deleteMany({
      where: { name: { contains: tag } },
    });
    await app.close();
  });

  describe('GET /destination-catalog', () => {
    it('finds by name, ignoring case', async () => {
      const { body } = await get(`/destination-catalog?q=PARIS ${tag}`).expect(
        200,
      );

      expect(names(body)).toEqual([`Paris ${tag}`]);
    });

    it('treats % in the search text literally', async () => {
      const { body } = await get(
        `/destination-catalog?q=${encodeURIComponent(`100% ${tag}`)}`,
      ).expect(200);

      expect(names(body)).toEqual([`100% ${tag}`]);
      const all = await get(
        `/destination-catalog?q=${encodeURIComponent('%')}`,
      ).expect(200);
      // A literal '%' only matches names that contain one — not every row.
      expect(names(all.body)).toContain(`100% ${tag}`);
      expect(names(all.body).every((name) => name.includes('%'))).toBe(true);
    });

    it('treats _ and % in an exact filter literally', async () => {
      const underscore = await get(
        `/destination-catalog?q=${tag}&country=Fran_a`,
      ).expect(200);
      const percent = await get(
        `/destination-catalog?q=${tag}&country=Fran%25`,
      ).expect(200);

      expect(underscore.body.data).toEqual([]);
      expect(percent.body.data).toEqual([]);
    });

    it('filters by country name or ISO code', async () => {
      const byName = await get(
        `/destination-catalog?q=${tag}&country=FRANÇA`,
      ).expect(200);
      const byCode = await get(
        `/destination-catalog?q=${tag}&country=fr`,
      ).expect(200);

      expect(names(byName.body)).toEqual([`Nice ${tag}`, `Paris ${tag}`]);
      expect(names(byCode.body)).toEqual([`Nice ${tag}`, `Paris ${tag}`]);
    });

    it('filters by category and combines filters', async () => {
      const { body } = await get(
        `/destination-catalog?q=${tag}&category=CITY&country=Portugal`,
      ).expect(200);

      expect(names(body)).toEqual([`Porto ${tag}`]);
      expect(body.meta.total).toBe(1);
    });

    it('is public and keeps the A to Z order', async () => {
      const { body } = await get(
        `/destination-catalog?q=${tag}&limit=2`,
      ).expect(200);

      expect(names(body)).toEqual([`100% ${tag}`, `Nice ${tag}`]);
      expect(body.meta.total).toBe(4);
    });

    it('treats blank filters as not provided', async () => {
      const { body } = await get(
        `/destination-catalog?q=%20%20&country=`,
      ).expect(200);

      expect(body.meta.total).toBeGreaterThanOrEqual(4);
    });

    it('rejects an unknown category with 422', async () => {
      await get('/destination-catalog?category=MOON').expect(422);
    });
  });

  describe('GET /activity-catalog', () => {
    it('finds by name, by type, by city and by country', async () => {
      expect(
        names((await get(`/activity-catalog?q=louvre ${tag}`)).body),
      ).toEqual([`Louvre ${tag}`]);
      expect(
        names((await get(`/activity-catalog?q=${tag}&type=FOOD`)).body),
      ).toEqual([`Bistrô ${tag}`, `Cais ${tag}`]);
      expect(
        names((await get(`/activity-catalog?q=${tag}&city=paris`)).body),
      ).toEqual([`Bistrô ${tag}`, `Louvre ${tag}`]);
      expect(
        names((await get(`/activity-catalog?q=${tag}&country=portugal`)).body),
      ).toEqual([`Aqueduto ${tag}`, `Cais ${tag}`]);
    });

    it('filters by minimum rating, leaving unrated activities out', async () => {
      const { body } = await get(
        `/activity-catalog?q=${tag}&minRating=4`,
      ).expect(200);

      expect(names(body)).toEqual([`Aqueduto ${tag}`, `Louvre ${tag}`]);
    });

    it('sorts by rating, best first and unrated last', async () => {
      const { body } = await get(
        `/activity-catalog?q=${tag}&sort=rating`,
      ).expect(200);

      expect(names(body)).toEqual([
        `Louvre ${tag}`,
        `Aqueduto ${tag}`,
        `Bistrô ${tag}`,
        `Cais ${tag}`,
      ]);
    });

    it('sorts by name by default', async () => {
      const { body } = await get(`/activity-catalog?q=${tag}`).expect(200);

      expect(names(body)).toEqual([
        `Aqueduto ${tag}`,
        `Bistrô ${tag}`,
        `Cais ${tag}`,
        `Louvre ${tag}`,
      ]);
    });

    it('combines type, rating and sort', async () => {
      const { body } = await get(
        `/activity-catalog?q=${tag}&type=TOUR&minRating=4.5&sort=rating`,
      ).expect(200);

      expect(names(body)).toEqual([`Louvre ${tag}`]);
    });

    it.each([
      'minRating=6',
      'minRating=-1',
      'minRating=abc',
      'type=MOON',
      'sort=price',
    ])('rejects %s with 422', async (query) => {
      await get(`/activity-catalog?${query}`).expect(422);
    });
  });
});
