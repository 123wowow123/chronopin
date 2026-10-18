// The wiki under a person's page (0151, src/lib/personWiki.ts):
// compiled from the sourced facts every time they are saved, and the record
// the page renders. Its references are Source rows (0026), so a cited link can
// have a link wiki of its own and is shared with any pin citing it.

import { sourceKind } from '@/lib/sourceKind';
import { generateOverview } from '@/lib/people';
import { compile, citedUrls, personWikiBundle, personWikiPage, urlIdentity, type CompiledPerson } from '@/lib/personWiki';
import * as db from '../db';
import Person from './person';
import Source from './source';

export default class PersonWiki {
  // Compiles and saves one person's wiki; false when there is no such person.
  static async rebuild(personId: number, now: Date = new Date()): Promise<boolean> {
    const stored = await Person.profile(personId);
    if (!stored) return false;
    // Everyone's radar is backed by the wiki: a person with no hand-researched
    // phases gets an Overview generated from what is documented, stored with
    // the phases; one with researched phases keeps those.
    const hand = stored.phases.filter((p) => p.origin !== 'generated');
    const overview = hand.length ? null : generateOverview(stored);
    await Person.setGeneratedPhase(personId, overview);
    const profile = { ...stored, phases: overview ? [overview, ...hand] : hand };
    const urls = citedUrls(profile);
    const added = new Map(
      (await db.query<{ sourceId: number; added: string }>(
        `SELECT "sourceId", to_char("utcAddedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "added" FROM "PersonSource" WHERE "personId" = $1`,
        [personId],
      )).map((r) => [r.sourceId, r.added]),
    );
    const today = now.toISOString().slice(0, 10);
    const known = new Map<string, { title: string | null; recorded: string | null }>();
    const rows: { sourceId: number; ref: number; added: Date | null }[] = [];
    for (const [i, url] of urls.entries()) {
      const source = await Source.ensure(url, sourceKind(url));
      if (!source) {
        known.set(urlIdentity(url), { title: null, recorded: today });
        continue;
      }
      known.set(urlIdentity(url), { title: source.title, recorded: added.get(source.id) ?? today });
      rows.push({ sourceId: source.id, ref: i + 1, added: null });
    }
    const compiled = compile(profile, known, now);
    await db.transaction(async (q) => {
      await q(`DELETE FROM "PersonSource" WHERE "personId" = $1`, [personId]);
      for (const row of rows) {
        await q(
          `INSERT INTO "PersonSource" ("personId", "sourceId", "ref", "utcAddedDateTime") VALUES ($1, $2, $3, COALESCE($4::date, now()::date))`,
          [personId, row.sourceId, row.ref, added.get(row.sourceId) ?? null],
        );
      }
      await q(
        `INSERT INTO "PersonWiki" ("personId", "profile", "page", "wikiVersion", "utcBuiltDateTime")
         VALUES ($1, $2::jsonb, $3, $4, $5)
         ON CONFLICT ("personId") DO UPDATE SET "profile" = EXCLUDED."profile", "page" = EXCLUDED."page",
           "wikiVersion" = EXCLUDED."wikiVersion", "utcBuiltDateTime" = EXCLUDED."utcBuiltDateTime"`,
        [personId, JSON.stringify(compiled), personWikiPage(compiled), compiled.wikiVersion, now],
      );
    });
    return true;
  }

  static async rebuildAll(): Promise<number> {
    const ids = await db.query<{ id: number }>(`SELECT "id" FROM "Person" ORDER BY "id"`);
    for (const { id } of ids) await PersonWiki.rebuild(id);
    return ids.length;
  }

  // The compiled profile the page renders; built now when there is none yet.
  static async compiled(personId: number): Promise<CompiledPerson | null> {
    const read = () => db.query<{ profile: CompiledPerson }>(`SELECT "profile" FROM "PersonWiki" WHERE "personId" = $1`, [personId]);
    let rows = await read();
    if (!rows.length && (await PersonWiki.rebuild(personId))) rows = await read();
    return rows[0]?.profile ?? null;
  }

  static async page(personId: number): Promise<string | null> {
    const rows = await db.query<{ page: string }>(`SELECT "page" FROM "PersonWiki" WHERE "personId" = $1`, [personId]);
    return rows[0]?.page ?? null;
  }

  // The wikis as an OKF bundle (all of them without ids).
  static async bundle(ids?: number[]): Promise<Map<string, string>> {
    const rows = await db.query<{ slug: string; name: string; role: string; page: string; builtAt: Date }>(
      `SELECT "p"."slug", "p"."name", "p"."role", "w"."page", "w"."utcBuiltDateTime" AS "builtAt"
       FROM "PersonWiki" AS "w" JOIN "Person" AS "p" ON "p"."id" = "w"."personId"
       WHERE $1::integer[] IS NULL OR "w"."personId" = ANY($1::integer[]) ORDER BY "p"."slug"`,
      [ids ?? null],
    );
    return personWikiBundle(rows);
  }

  // Cited links still waiting for a link wiki of their own.
  static async pendingSources(limit = 100_000): Promise<{ id: number; url: string }[]> {
    return db.query<{ id: number; url: string }>(
      `SELECT DISTINCT "s"."id", "s"."url" FROM "Source" AS "s" JOIN "PersonSource" AS "ps" ON "ps"."sourceId" = "s"."id"
       WHERE "s"."status" = 'pending' OR ("s"."status" = 'failed' AND "s"."attempts" < 3)
       ORDER BY "s"."id" LIMIT $1`,
      [limit],
    );
  }
}
