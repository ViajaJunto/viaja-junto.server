import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateDestinationCatalogDto } from './create-destination-catalog.dto.js';

const check = (countryCode?: unknown) =>
  validate(
    plainToInstance(CreateDestinationCatalogDto, {
      name: 'Paris',
      countryCode,
    }),
  );

describe('CreateDestinationCatalogDto countryCode', () => {
  it.each(['FR', 'BR', 'JP'])('accepts %s', async (code) => {
    expect(await check(code)).toHaveLength(0);
  });

  it('is optional', async () => {
    expect(await check(undefined)).toHaveLength(0);
  });

  it('upper-cases a lower-case code', async () => {
    const dto = plainToInstance(CreateDestinationCatalogDto, {
      name: 'Paris',
      countryCode: ' fr ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.countryCode).toBe('FR');
  });

  it.each(['XX', 'FRA', 'F', '12', 5])('rejects %j', async (code) => {
    const errors = await check(code);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('countryCode');
  });
});
