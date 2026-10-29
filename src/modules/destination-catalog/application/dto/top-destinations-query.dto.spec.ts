import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { TopDestinationsQueryDto } from './top-destinations-query.dto.js';

const parse = (query: Record<string, unknown>) =>
  plainToInstance(TopDestinationsQueryDto, query);

describe('TopDestinationsQueryDto', () => {
  it('defaults to 10', async () => {
    const dto = parse({});

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.limit).toBe(10);
  });

  it('converts the query-string limit to a number', async () => {
    const dto = parse({ limit: '5' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.limit).toBe(5);
  });

  it.each(['0', '-1', '51', 'abc', '2.5'])(
    'rejects limit=%s',
    async (limit) => {
      expect(await validate(parse({ limit }))).toHaveLength(1);
    },
  );
});
