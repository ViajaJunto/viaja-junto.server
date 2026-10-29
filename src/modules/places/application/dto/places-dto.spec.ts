import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ImportPlaceDto } from './import-place.dto.js';
import { SearchPlacesQueryDto } from './search-places-query.dto.js';

const search = (query: Record<string, unknown>) =>
  plainToInstance(SearchPlacesQueryDto, query);
const importing = (externalId: unknown) =>
  plainToInstance(ImportPlaceDto, { externalId });

describe('SearchPlacesQueryDto', () => {
  it('trims the text and defaults the limit to 5', async () => {
    const dto = search({ q: '  louvre ' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ q: 'louvre', limit: 5 });
  });

  it('converts the limit', async () => {
    const dto = search({ q: 'louvre', limit: '10' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.limit).toBe(10);
  });

  it.each([{}, { q: '' }, { q: ' ' }, { q: 'a' }, { q: 'x'.repeat(101) }])(
    'rejects the text %j',
    async (query) => {
      expect(await validate(search(query))).not.toHaveLength(0);
    },
  );

  it.each(['0', '11', 'abc'])('rejects limit=%s', async (limit) => {
    expect(await validate(search({ q: 'louvre', limit }))).not.toHaveLength(0);
  });
});

describe('ImportPlaceDto', () => {
  it.each(['osm:node:240109189', 'osm:way:1', 'osm:relation:7444'])(
    'accepts %s',
    async (id) => {
      expect(await validate(importing(id))).toHaveLength(0);
    },
  );

  it.each([
    '',
    'osm:planet:1',
    'osm:node:0',
    'node:1',
    'https://x.test',
    5,
    undefined,
  ])('rejects %j', async (id) => {
    expect(await validate(importing(id))).not.toHaveLength(0);
  });
});
