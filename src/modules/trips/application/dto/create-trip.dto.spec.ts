import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTripDto } from './create-trip.dto.js';

const check = (currency?: unknown) =>
  validate(plainToInstance(CreateTripDto, { name: 'Eurotrip', currency }));

describe('CreateTripDto currency', () => {
  it.each(['BRL', 'EUR', 'USD', 'JPY'])('accepts %s', async (currency) => {
    expect(await check(currency)).toHaveLength(0);
  });

  it('accepts a trip without a currency (it defaults to BRL)', async () => {
    expect(await check(undefined)).toHaveLength(0);
  });

  it('normalizes lower-case codes', async () => {
    const dto = plainToInstance(CreateTripDto, {
      name: 'Eurotrip',
      currency: 'eur',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.currency).toBe('EUR');
  });

  it.each(['XXX1', 'EU', 'ABC', '€', 123])('rejects %j', async (currency) => {
    const errors = await check(currency);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('currency');
  });
});
