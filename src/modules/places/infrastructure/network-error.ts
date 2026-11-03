/** " (ETIMEDOUT)" for a failed `fetch`, so the answer says why; empty when unknown. */
export function causeOf(error: unknown): string {
  const cause = (error as { cause?: { code?: unknown; errors?: unknown } })
    ?.cause;
  const nested = Array.isArray(cause?.errors)
    ? (cause.errors as { code?: unknown }[])
    : [];
  const codes = [...new Set([cause?.code, ...nested.map((e) => e?.code)])]
    .filter((code): code is string => typeof code === 'string')
    .join(', ');

  return codes ? ` (${codes})` : '';
}
