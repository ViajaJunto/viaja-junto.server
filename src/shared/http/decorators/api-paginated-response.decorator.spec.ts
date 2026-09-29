import { describe, expect, it } from 'vitest';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPaginatedResponse } from './api-paginated-response.decorator.js';

class SampleDto {
  @ApiProperty({ example: 'x' })
  id!: string;
}

describe('ApiPaginatedResponse', () => {
  it('returns a decorator that can be applied to a method', () => {
    const decorate = ApiPaginatedResponse(SampleDto);

    expect(typeof decorate).toBe('function');

    class Controller {
      findAll() {
        return null;
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'findAll',
    )!;

    expect(() =>
      decorate(Controller.prototype, 'findAll', descriptor),
    ).not.toThrow();
  });

  it('accepts a custom description', () => {
    expect(typeof ApiPaginatedResponse(SampleDto, 'Custom text')).toBe(
      'function',
    );
  });
});
