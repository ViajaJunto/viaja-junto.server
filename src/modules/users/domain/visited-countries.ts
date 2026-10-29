// Pure grouping of the places a user has been. No framework and no ORM
// dependency.

/** One destination of a completed trip, as the map needs it. */
export interface VisitedPlace {
  tripId: string;
  country: string | null;
  countryCode: string | null;
}

export interface VisitedCountry {
  country: string | null;
  /** ISO 3166-1 alpha-2, when the catalog knows it. */
  countryCode: string | null;
  /** In how many of the user's completed trips the country appears. */
  tripCount: number;
}

const clean = (value: string | null | undefined): string | null =>
  value?.trim() || null;

/**
 * Distinct countries across the places visited, sorted by name.
 *
 * Places are grouped by ISO code when there is one, otherwise by name
 * (case-insensitively), so "França" and "FRANÇA" are one country. A place with
 * neither cannot be put on a map and is skipped. When the same country shows
 * up both with and without a code, the code is kept.
 */
export function groupVisitedCountries(
  places: VisitedPlace[],
): VisitedCountry[] {
  const groups = new Map<
    string,
    { country: string | null; countryCode: string | null; trips: Set<string> }
  >();

  for (const place of places) {
    const country = clean(place.country);
    const countryCode = clean(place.countryCode)?.toUpperCase() ?? null;
    const key = countryCode ?? country?.toLowerCase();

    if (!key) continue;

    const group = groups.get(key) ?? {
      country,
      countryCode,
      trips: new Set<string>(),
    };
    group.country ??= country;
    group.countryCode ??= countryCode;
    group.trips.add(place.tripId);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ country, countryCode, trips }) => ({
      country,
      countryCode,
      tripCount: trips.size,
    }))
    .sort((a, b) =>
      (a.country ?? a.countryCode ?? '').localeCompare(
        b.country ?? b.countryCode ?? '',
      ),
    );
}
