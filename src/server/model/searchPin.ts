import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import config from '../config';
import { fetchJson } from '../util/fetchJson';
import BasePin, { BasePinProp } from './basePin';
import BasePins from './basePins';
import Pins from './pins';
import type User from './user';

function faissRequest<T = any>(method: string, path: string, body?: unknown) {
  return fetchJson<T>(`${config.faiss.serviceUrl}/faiss${path}`, { method, body });
}

type FaissSearchResult = { res: { index: number; match: number }[]; took?: number };

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
  // its top config.faiss.maxHits, since semantic search ranks every pin.
  static async hits(searchText: string): Promise<{ id: number; score: number }[]> {
    const result = await semanticSearch(searchText, config.faiss.maxHits);
    const seen = new Set<number>();
    return result.res.filter((hit) => !seen.has(hit.index) && !!seen.add(hit.index)).map((hit) => ({ id: hit.index, score: hit.match }));
  }

  // Autocomplete: pins whose title or description starts with the typed text,
  // compared on their first 64 characters, case-insensitively. k caps the
  // rows returned.
  static async querySearchPin(title: string, description: string, k = 10): Promise<Pins> {
    const rows = await db.query(
      `
        SELECT "Pin".*
        FROM "PinBaseView" AS "Pin"
        WHERE "Pin"."utcDeletedDateTime" IS NULL
          AND (left("Pin"."title", 64) ILIKE rtrim(left($1, 64)) || '%'
            OR left("Pin"."description", 64) ILIKE rtrim(left($2, 64)) || '%')
        ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"
        LIMIT $3`,
      [title, description, k],
    );
    return new Pins({ pins: rows, queryCount: rows.length });
  }
}

function semanticSearch(searchText: string, numberOfResults: number) {
  return faissRequest<FaissSearchResult>('GET', `/search?q=${encodeURIComponent(searchText)}&k=${numberOfResults}`);
}
