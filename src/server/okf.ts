import { okfBundle, type OkfPin, type OkfSource } from '@/lib/okf';
import { absoluteUrl, pinPath } from '@/lib/seo';
import * as db from './db';
import { getWikiRecheck } from './model/appSetting';
import Source, { PinSource } from './model/source';

// Loads pins and their links' wikis and renders them as an OKF bundle (see
// src/lib/okf.ts). With pinIds, just those pins and the links they cite;
// without, every live pin that cites a link.
export async function loadOkfBundle(pinIds?: number[]): Promise<Map<string, string>> {
  const pins = await db.query<Omit<OkfPin, 'url' | 'links'>>(
    `SELECT "Pin"."id", "Pin"."title", "Pin"."description", "Pin"."utcStartDateTime", "Pin"."utcEndDateTime", "Pin"."allDay",
            "Pin"."category", "Company"."name" AS "company", "Pin"."longFormSummary"
     FROM "Pin" LEFT JOIN "Company" ON "Company"."id" = "Pin"."companyId"
     WHERE "Pin"."utcDeletedDateTime" IS NULL
       AND ($1::integer[] IS NULL OR "Pin"."id" = ANY($1::integer[]))
       AND EXISTS (SELECT 1 FROM "PinSource" WHERE "PinSource"."pinId" = "Pin"."id")
     ORDER BY "Pin"."id"`,
    [pinIds ?? null],
  );
  const okfPins: OkfPin[] = [];
  const sourceIds = new Set<number>();
  for (const pin of pins) {
    const links = (await PinSource.forPin(pin.id)).filter((row) => !row.utcRemovedDateTime);
    links.forEach((row) => sourceIds.add(row.sourceId));
    okfPins.push({ ...pin, url: absoluteUrl(pinPath(pin)), links: links.map(({ sourceId, role }) => ({ sourceId, role })) });
  }
  const ids = [...sourceIds];
  const rows = ids.length
    ? await db.query<Omit<OkfSource, 'wiki'>>(
        `SELECT "id", "url", "title", to_char("sourceModifiedDate", 'YYYY-MM-DD') AS "sourceModifiedDate", "generatedBy",
                "utcBuiltDateTime", "utcFetchedDateTime", "wikiVersion"
         FROM "Source" WHERE "id" = ANY($1::integer[]) ORDER BY "id"`,
        [ids],
      )
    : [];
  const wikis = await Source.wikis(ids);
  // A link has a date it goes stale only when re-reads go by age (a view can
  // bring its read sooner, which moves the date out again).
  const { days } = await getWikiRecheck();
  return okfBundle(
    okfPins,
    rows.map((row) => ({ ...row, wiki: wikis.get(row.id) ?? null })),
    { recheckDays: days },
  );
}
