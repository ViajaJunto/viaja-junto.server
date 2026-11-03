import { describe, expect, it, vi } from 'vitest';
import { WikipediaPhotoProvider } from './wikipedia-photo.provider.js';

const pages = (list: { title: string; index?: number; thumb?: string }[]) => ({
  query: {
    pages: Object.fromEntries(
      list.map((page, i) => [
        String(i + 1),
        {
          title: page.title,
          index: page.index ?? i + 1,
          ...(page.thumb ? { thumbnail: { source: page.thumb } } : {}),
        },
      ]),
    ),
  },
});

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

const build = (fetchImpl: ReturnType<typeof vi.fn>, languages?: string[]) =>
  new WikipediaPhotoProvider({
    userAgent: 'ViajaJunto/1.0 (test@example.com)',
    timeoutMs: 1000,
    languages,
    fetch: fetchImpl as unknown as typeof fetch,
  });

describe('WikipediaPhotoProvider', () => {
  it('searches the article with an identifying User-Agent and returns its image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        pages([
          {
            title: 'Big Ben',
            thumb: 'https://upload.wikimedia.org/bigben.jpg',
          },
        ]),
      ),
    );

    const photo = await build(fetchMock).find('Big Ben');

    expect(photo).toBe('https://upload.wikimedia.org/bigben.jpg');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.origin + url.pathname).toBe(
      'https://pt.wikipedia.org/w/api.php',
    );
    expect(url.searchParams.get('gsrsearch')).toBe('Big Ben');
    expect(url.searchParams.get('prop')).toBe('pageimages');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(
      'ViajaJunto/1.0 (test@example.com)',
    );
  });

  it('ignores accents, case and punctuation when matching the title', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json(pages([{ title: "Musée d'Orsay", thumb: 'https://u/orsay.jpg' }])),
      );

    await expect(build(fetchMock).find('musee dorsay')).resolves.toBe(
      'https://u/orsay.jpg',
    );
  });

  it('accepts an article whose title continues the name (a disambiguation suffix)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        pages([
          {
            title: 'Ponte de Londres (Londres)',
            thumb: 'https://u/bridge.jpg',
          },
        ]),
      ),
    );

    await expect(build(fetchMock).find('Ponte de Londres')).resolves.toBe(
      'https://u/bridge.jpg',
    );
  });

  it('refuses an article about something else, so a restaurant never gets a wrong photo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        pages([
          {
            title: 'Dishoom (restaurante de Mumbai)',
            thumb: 'https://u/x.jpg',
          },
          { title: 'Culinária indiana', thumb: 'https://u/y.jpg' },
        ]),
      ),
    );

    await expect(build(fetchMock, ['pt']).find('Dave')).resolves.toBeNull();
  });

  it('skips articles without an image and takes the best ranked one that has it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(
        pages([
          { title: 'Big Ben', index: 1 },
          { title: 'Big Ben (torre)', index: 3, thumb: 'https://u/third.jpg' },
          {
            title: 'Big Ben (relógio)',
            index: 2,
            thumb: 'https://u/second.jpg',
          },
        ]),
      ),
    );

    await expect(build(fetchMock).find('Big Ben')).resolves.toBe(
      'https://u/second.jpg',
    );
  });

  it('falls back to the next language when the first has no article', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ batchcomplete: '' }))
      .mockResolvedValueOnce(
        json(pages([{ title: 'Harrods', thumb: 'https://u/harrods.jpg' }])),
      );

    await expect(build(fetchMock).find('Harrods')).resolves.toBe(
      'https://u/harrods.jpg',
    );
    expect((fetchMock.mock.calls[1] as unknown as [URL])[0].hostname).toBe(
      'en.wikipedia.org',
    );
  });

  it.each([
    ['an HTTP error', () => Promise.resolve(new Response('', { status: 500 }))],
    ['a network error', () => Promise.reject(new Error('down'))],
    [
      'something that is not JSON',
      () => Promise.resolve(new Response('<html>')),
    ],
  ])('is "no photo", never an exception, on %s', async (_label, answer) => {
    await expect(
      build(vi.fn(answer), ['pt']).find('Big Ben'),
    ).resolves.toBeNull();
  });
});
