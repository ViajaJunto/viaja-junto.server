import { Transform } from 'class-transformer';

/** Trims a query-string value and turns a blank one into "not provided". */
export const TrimmedText = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();

    return trimmed === '' ? undefined : trimmed;
  });
