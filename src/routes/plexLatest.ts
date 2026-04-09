import { Hono } from 'hono';
import type { Bindings } from '../app';

type PlexSection = {
  key: string;
  type: string;
};

type PlexItem = {
  ratingKey: string;
  title: string;
  subtitle: string | null;
  year: number | null;
  addedAt: number | null;
  imagePath: string | null;
};

type JsonObject = Record<string, unknown>;

const MIN_ITEM_COUNT = 3;
const MAX_ITEM_COUNT = 5;
const DEFAULT_ITEM_COUNT = MAX_ITEM_COUNT;

const PLEX_ACCEPT_HEADER = 'application/json, application/xml;q=0.9, text/xml;q=0.8';

const plexLatestRoute = new Hono<{ Bindings: Bindings }>();

plexLatestRoute.get('/plex/latest', async (c) => {
  const baseUrl = c.env.PLEX_BASE_URL;
  const token = c.env.PLEX_TOKEN;

  if (!baseUrl || !token) {
    return c.json(
      {
        error: 'Server misconfigured',
        message: 'Missing PLEX_BASE_URL or PLEX_TOKEN',
      },
      500,
    );
  }

  const requestedCount = Number.parseInt(c.req.query('count') ?? '', 10);
  const itemCount = Number.isNaN(requestedCount)
    ? DEFAULT_ITEM_COUNT
    : clamp(requestedCount, MIN_ITEM_COUNT, MAX_ITEM_COUNT);

  try {
    const sections = await fetchSections(baseUrl, token);
    const movieSections = sections.filter(
      (section) => section.type === 'movie',
    );
    const showSections = sections.filter((section) => section.type === 'show');

    const [movies, shows] = await Promise.all([
      fetchLatestByType(baseUrl, token, movieSections, itemCount),
      fetchLatestByType(baseUrl, token, showSections, itemCount),
    ]);

    const response = {
      title: 'Plex Latest Additions',
      generatedAt: new Date().toISOString(),
      itemCount,
      movies: {
        featured: movies[0] ?? null,
        items: movies,
      },
      tv: {
        featured: shows[0] ?? null,
        items: shows,
      },
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: 'Upstream service error',
        message:
          error instanceof Error ? error.message : 'Failed to fetch Plex data',
      },
      502,
    );
  }
});

async function fetchLatestByType(
  baseUrl: string,
  token: string,
  sections: PlexSection[],
  itemCount: number,
): Promise<Array<Record<string, unknown>>> {
  if (sections.length === 0) {
    return [];
  }

  const sectionResults = await Promise.all(
    sections.map(async (section) => {
      const url = new URL(
        `/library/sections/${section.key}/recentlyAdded`,
        baseUrl,
      );
      url.searchParams.set('X-Plex-Token', token);
      url.searchParams.set('X-Plex-Container-Start', '0');
      url.searchParams.set('X-Plex-Container-Size', String(itemCount));

      const response = await fetch(url, {
        headers: {
          Accept: PLEX_ACCEPT_HEADER,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Plex recentlyAdded request failed (${response.status}) for section ${section.key}`,
        );
      }

      return parsePlexItems(await response.text());
    }),
  );

  const merged = sectionResults.flat();

  merged.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));

  return merged.slice(0, itemCount).map((item) => ({
    ratingKey: item.ratingKey,
    title: item.title,
    subtitle: item.subtitle,
    year: item.year,
    addedAt: item.addedAt,
    imageUrl: buildImageUrl(baseUrl, token, item.imagePath),
  }));
}

async function fetchSections(
  baseUrl: string,
  token: string,
): Promise<PlexSection[]> {
  const url = new URL('/library/sections', baseUrl);
  url.searchParams.set('X-Plex-Token', token);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, application/xml;q=0.9, text/xml;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Plex sections request failed (${response.status})`);
  }

  return parsePlexSections(await response.text());
}

function parsePlexSections(payload: string): PlexSection[] {
  const jsonPayload = safeJsonParse(payload);
  if (jsonPayload) {
    const mediaContainer = asObject(jsonPayload.MediaContainer);
    const directories = asArray(mediaContainer?.Directory);

    if (directories) {
      return directories
        .map((item) => asObject(item))
        .filter((item): item is JsonObject => item !== null)
        .map((item) => ({ key: asString(item.key), type: asString(item.type) }))
        .filter((item) => item.key.length > 0 && item.type.length > 0);
    }
  }

  const sections: PlexSection[] = [];
  for (const attributes of parseXmlElements(payload, 'Directory')) {
    const key = attributes.key;
    const type = attributes.type;
    if (key && type) {
      sections.push({ key, type });
    }
  }

  return sections;
}

function parsePlexItems(payload: string): PlexItem[] {
  const jsonPayload = safeJsonParse(payload);
  if (jsonPayload) {
    const mediaContainer = asObject(jsonPayload.MediaContainer);
    const metadata = asArray(mediaContainer?.Metadata);

    if (metadata) {
      return metadata
        .map((item) => asObject(item))
        .filter((item): item is JsonObject => item !== null)
        .map(mapJsonItem)
        .filter((item) => item.title.length > 0);
    }
  }

  const parsed: PlexItem[] = [];

  for (const attributes of [
    ...parseXmlElements(payload, 'Video'),
    ...parseXmlElements(payload, 'Directory'),
  ]) {
    const title = attributes.title ?? '';
    if (!title) {
      continue;
    }

    parsed.push({
      ratingKey: attributes.ratingKey ?? '',
      title,
      subtitle: attributes.parentTitle ?? null,
      year: parseIntOrNull(attributes.year ?? null),
      addedAt: parseIntOrNull(attributes.addedAt ?? null),
      imagePath: attributes.grandparentThumb ?? attributes.parentThumb ?? attributes.thumb ?? attributes.art ?? null,
    });
  }

  return parsed;
}

function mapJsonItem(item: JsonObject): PlexItem {
  const title = asString(item.title);
  const parentTitle = asString(item.parentTitle);
  const grandparentTitle = asString(item.grandparentTitle);

  // Episodes often use parent/grandparent fields for series + season context.
  const subtitle = grandparentTitle || parentTitle || null;

  return {
    ratingKey: asString(item.ratingKey),
    title,
    subtitle,
    year: asNumberOrNull(item.year),
    addedAt: asNumberOrNull(item.addedAt),
    imagePath: asString(item.grandparentThumb) || asString(item.parentThumb) || asString(item.thumb) || asString(item.art) || null,
  };
}

function safeJsonParse(payload: string): JsonObject | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return asObject(parsed);
  } catch {
    return null;
  }
}

function asObject(value: unknown): JsonObject | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function parseXmlElements(
  payload: string,
  tagName: string,
): Array<Record<string, string>> {
  const tagRegex = new RegExp(`<${tagName}\\s+([^>]+?)\\/?\\s*>`, 'g');
  const attributeRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)="([^"]*)"/g;
  const elements: Array<Record<string, string>> = [];

  let tagMatch: RegExpExecArray | null = tagRegex.exec(payload);
  while (tagMatch) {
    const attributes: Record<string, string> = {};
    attributeRegex.lastIndex = 0;
    let attributeMatch: RegExpExecArray | null = attributeRegex.exec(
      tagMatch[1],
    );

    while (attributeMatch) {
      attributes[attributeMatch[1]] = attributeMatch[2];
      attributeMatch = attributeRegex.exec(tagMatch[1]);
    }

    elements.push(attributes);
    tagMatch = tagRegex.exec(payload);
  }

  return elements;
}

function parseIntOrNull(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function buildImageUrl(
  baseUrl: string,
  token: string,
  imagePath: string | null,
): string | null {
  if (!imagePath) {
    return null;
  }

  // Use Plex's photo transcoder to force portrait dimensions (2:3 ratio)
  const url = new URL('/photo/:/transcode', baseUrl);
  url.searchParams.set('width', '200');
  url.searchParams.set('height', '300');
  url.searchParams.set('url', imagePath);
  url.searchParams.set('X-Plex-Token', token);
  return url.toString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export { plexLatestRoute };
