import { PlacePhotoProvider } from '../domain/place-photo.provider.js';

export interface WikipediaPhotoOptions {
  /** Wikimedia requires a User-Agent that identifies the application. */
  userAgent: string;
  timeoutMs: number;
  /** Wikipedia language editions to look in, in order. */
  languages?: string[];
  fetch?: typeof fetch;
}

interface WikipediaPage {
  title?: string;
  index?: number;
  thumbnail?: { source?: string };
}

const THUMBNAIL_WIDTH_PX = 800;

/** Used when PLACES_USER_AGENT is not set: Wikimedia asks for a name and a way to reach the project. */
export const DEFAULT_USER_AGENT =
  'ViajaJunto/1.0 (https://github.com/ViajaJunto/viaja-junto.server)';

/** Lower case, no accents or punctuation: "Musée d'Orsay" and "musee dorsay" compare equal. */
const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * The lead image of the Wikipedia article about a place
 * (https://www.mediawiki.org/wiki/API:Search with the PageImages extension).
 * An article only counts when its title matches the place's name, so a search
 * for a restaurant never ends up with a photo of something else. The images
 * are free to use under their Wikimedia Commons licences, which ask for credit.
 * Every failure is "no photo": it must never break finding the activities.
 */
export class WikipediaPhotoProvider implements PlacePhotoProvider {
  private readonly http: typeof fetch;
  private readonly languages: string[];

  constructor(private readonly options: WikipediaPhotoOptions) {
    this.http = options.fetch ?? fetch;
    this.languages = options.languages ?? ['pt', 'en'];
  }

  async find(name: string): Promise<string | null> {
    for (const language of this.languages) {
      const photo = await this.findIn(language, name).catch(() => null);
      if (photo) return photo;
    }

    return null;
  }

  private async findIn(language: string, name: string): Promise<string | null> {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    for (const [key, value] of Object.entries({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: name,
      gsrlimit: '5',
      redirects: '1',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(THUMBNAIL_WIDTH_PX),
    })) {
      url.searchParams.set(key, value);
    }

    const response = await this.http(url, {
      headers: {
        'User-Agent': this.options.userAgent,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      query?: { pages?: Record<string, WikipediaPage> };
    };
    const wanted = normalise(name);
    const match = Object.values(body.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .find((page) => {
        const title = normalise(page.title ?? '');

        return (
          Boolean(page.thumbnail?.source) &&
          title !== '' &&
          (title === wanted ||
            title.startsWith(`${wanted} `) ||
            wanted.startsWith(`${title} `))
        );
      });

    return match?.thumbnail?.source ?? null;
  }
}
