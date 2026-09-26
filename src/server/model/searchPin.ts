import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import config from '../config';
import { fetchJson } from '../util/fetchJson';
import BasePin, { BasePinProp } from './basePin';
import BasePins from './basePins';
import Pins from './pins';
import type User from './user';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

function faissRequest<T = any>(method: string, path: string, body?: unknown) {
  return fetchJson<T>(`${config.faiss.serviceUrl}/faiss${path}`, { method, body });
}

type FaissSearchResult = { res: { index: number; match: number }[]; took?: number };

// Which of the search service's indexes reads a query (Docker/faiss/app.py):
// 'en' is an English model, 'multi' a multilingual one that places a query in
// any of the site's languages near the English words it means. A search from
// a page in another language reads the multilingual index, as does text in a
// script English does not use (a Chinese query typed on an English page).
// English stays on its own model, which reads English better and is what
// duplicate detection's thresholds are set against.
export type SearchModel = 'en' | 'multi';

export function searchModelFor(text: string, locale: string = DEFAULT_LOCALE): SearchModel {
  return locale !== DEFAULT_LOCALE || /(?!\p{Script=Latin})\p{L}/u.test(text) ? 'multi' : 'en';
}

// A pin as the search service knows it: just enough to index.
export class SearchPin extends BasePin {
  declare favorites: number[];
  declare likes: number[];

  constructor(pin?: Row | null, user?: User | null) {
    super(pin, user, BasePinProp.concat(['searchScore', 'highlight']));
  }

  set(pin: Row, user?: User | null): this {
    super.set(pin, user);
    this.favorites = _.get(pin, 'favorites', []).map((f: Row) => f.userId);
    this.likes = _.get(pin, 'likes', []).map((l: Row) => l.userId);
    return this;
  }

  save() {
    return faissRequest('POST', '/add', { id: this.id, title: this.title, description: this.description });
  }

  update() {
    return this.save();
  }

  delete() {
    return faissRequest('DELETE', '/remove', { id: this.id });
  }

  // Empties the whole index, before a reseed.
  static resetIndex() {
    return faissRequest('DELETE', '/reset');
  }
}

export class SearchPins extends BasePins<SearchPin> {
  // Number of pins matching the query without paging, and the search
  // service's processing time (ms).
  declare hits: number | undefined;
  declare took: number | undefined;

  static numberOfResults = 20;

  set(pins: Row[] | { pins: Row[]; hits?: number; took?: number }): this {
    if (Array.isArray(pins)) {
      this.setPins(pins).setHits(undefined);
    } else if (pins.pins && Number.isInteger(pins.hits)) {
      this.setPins(pins.pins).setHits(pins.hits).setTook(pins.took);
    } else {
      throw new Error('Pins cannot set value of arg');
    }
    return this;
  }

  setPins(pins: Row[]): this {
    if (!Array.isArray(pins)) {
      throw new Error('arg is not an array');
    }
    this.pins = pins.map((p) => new SearchPin(p));
    return this;
  }

  setHits(hits: number | null | undefined): this {
    if (Number.isInteger(hits) || hits == null) {
      this.hits = hits ?? undefined;
    } else {
      throw new Error('arg is not an integer, undefined, null');
    }
    return this;
  }

  setTook(took: number | null | undefined): this {
    if (Number.isInteger(took) || took == null) {
      this.took = took ?? undefined;
    } else {
      throw new Error('arg is not an integer, undefined, null');
    }
    return this;
  }

  fromFaiss(result: FaissSearchResult): this {
    const pins = result.res.map((p) => ({ id: p.index, searchScore: p.match }));
    return this.set(pins).setHits(result.res.length).setTook(result.took);
  }

  // Copies each hit's searchScore (cosine similarity, higher is more
  // relevant) onto the full pins loaded for those hits, which come back in
  // date order - so a client can keep that order or re-sort by relevance.
  applySearchScores(pins: Pins): Pins {
    const scores = new Map(this.pins.map((p) => [p.id, p.searchScore]));
    pins.pins.forEach((pin) => {
      pin.searchScore = scores.get(pin.id);
    });
    return pins;
  }

  static async search(searchText: string): Promise<Pins> {
    const hits = new SearchPins().fromFaiss(await semanticSearch(searchText, SearchPins.numberOfResults));
    const pins = await Pins.queryPinByIds(hits);
    return hits.applySearchScores(pins);
  }

  // Every pin the search service counts as a match for the text, best first:
  // its top config.faiss.maxHits, since semantic search ranks every pin. In
  // the index for the page's language (searchModelFor).
  static async hits(searchText: string, locale?: string): Promise<{ id: number; score: number }[]> {
    const result = await semanticSearch(searchText, config.faiss.maxHits, searchModelFor(searchText, locale));
    const seen = new Set<number>();
    return result.res.filter((hit) => !seen.has(hit.index) && !!seen.add(hit.index)).map((hit) => ({ id: hit.index, score: hit.match }));
  }

  // The k pins closest to the text, best first.
  static async nearest(text: string, k: number): Promise<{ id: number; score: number }[]> {
    const result = await semanticSearch(text, k);
    return result.res.map((hit) => ({ id: hit.index, score: hit.match }));
  }

  // Autocomplete: pins whose title or description starts with the typed text,
  // compared on their first 64 characters, case-insensitively - or, on a page
  // in another language, whose title in that language does. k caps the pins
  // returned.
  //
  // Read off "Pin", not the view. A suggestion is a title and a date in a
  // dropdown, and this runs on every keystroke - going through the view built
  // each candidate's references, ratings, view count and duplicate group, and
  // the LIMIT sat above all of it. It also counted the view's rows rather than
  // pins, so a pin with three pictures used up three of the ten suggestions.
  static async querySearchPin(title: string, description: string, k = 10, locale: string = DEFAULT_LOCALE): Promise<Pins> {
    const rows = await db.query(
      `
        SELECT "id", "title", "utcStartDateTime", "allDay"
        FROM "Pin"
        WHERE "utcDeletedDateTime" IS NULL
          AND (left("title", 64) ILIKE rtrim(left($1, 64)) || '%'
            OR left("description", 64) ILIKE rtrim(left($2, 64)) || '%'
            OR EXISTS (
              SELECT 1 FROM "PinTranslation" AS "tr"
              WHERE "tr"."pinId" = "Pin"."id" AND "tr"."locale" = $4 AND left("tr"."title", 64) ILIKE rtrim(left($1, 64)) || '%'))
        ORDER BY "utcStartDateTime", "id"
        LIMIT $3`,
      [title, description, k, locale === DEFAULT_LOCALE ? null : locale],
    );
    return new Pins({ pins: rows, queryCount: rows.length });
  }
}

function semanticSearch(searchText: string, numberOfResults: number, model: SearchModel = 'en') {
  const index = model === 'en' ? '' : `&model=${model}`;
  return faissRequest<FaissSearchResult>('GET', `/search?q=${encodeURIComponent(searchText)}&k=${numberOfResults}${index}`);
}
