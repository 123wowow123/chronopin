// People (0150): the people the /person/<slug> pages are about, and
// the sourced facts under each - earnings by year, laws and other
// contributions, property, trips. Filled on the dev machine
// (`npm run people:import`, `npm run people:apply`); prod stores
// what a local run sends it (PUT /api/people/:id).

import * as db from '../db';
import { topicSlug } from '@/lib/topics';
import {
  OCTAGON_AXES,
  collapseSparsePhases,
  ROLE_ORDER,
  type PersonContribution,
  type PersonEarning,
  type PersonMatter,
  type PersonPhase,
  type PersonResearchNote,
  type PersonProfile,
  type PersonProperty,
  type PersonSummary,
  type PersonTrip,
} from '@/lib/people';
import type { PersonInput } from '../personInput';
import { wordStartPattern, type PersonAxisBound } from '../util/searchQuery';

// DATE columns are read as text ('YYYY-MM-DD'): a Date would be local midnight.
const SUMMARY = `"id", "name", "slug", "role", "office", "jurisdiction", "party", "photoUrl", "leftOfficeDate"::text AS "leftOfficeDate", "deathDate"::text AS "deathDate"`;
const PROFILE = `${SUMMARY}, "politics", "politicsSourceUrl", "inOfficeSince"::text AS "inOfficeSince", "birthDate"::text AS "birthDate",
  "religion", "religionSourceUrl", "weightKg"::float8 AS "weightKg", "weightAsOf"::text AS "weightAsOf", "weightSourceUrl",
  "health", "healthAsOf"::text AS "healthAsOf", "healthSourceUrl", "description", "photoCredit", "wikiUrl", "websiteUrl", "bioguideId", "mattersCheckedDate"::text AS "mattersCheckedDate",
  "educationLevel"::float8 AS "educationLevel", "educationNote", "educationSourceUrl"`;

type Base = Omit<PersonProfile, 'earnings' | 'contributions' | 'properties' | 'trips'>;

const whole = (v: string | number | null) => (v == null ? null : Number(v));

export default class Person {
  // Everyone, the executive first and then by office and name.
  static async list(): Promise<PersonSummary[]> {
    const rows = await db.query<PersonSummary>(`SELECT ${SUMMARY} FROM "Person"`);
    return rows.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
  }

  // People for the search suggestions: a word of their name starting with the
  // typed text (when there is some), and every radar-axis bound met by their
  // best score across their phases (misconduct:>3). Most pins first, then the
  // index's order.
  static async suggest(text: string, bounds: PersonAxisBound[], limit: number) {
    const params: unknown[] = [];
    const add = (value: unknown) => `$${params.push(value)}`;
    const where: string[] = [];
    if (text.trim()) where.push(`"pe"."name" ~* ${add(wordStartPattern(text))}`);
    for (const { axis, op, value } of bounds) {
      where.push(
        `(SELECT max(("ph"."axes" -> ${add(axis)}::text ->> 'score')::numeric) FROM "PersonPhase" AS "ph" WHERE "ph"."personId" = "pe"."id") ${op} ${add(value)}::numeric`,
      );
    }
    if (!where.length) return [];
    const rows = await db.query<{ name: string; photoUrl: string | null; role: PersonSummary['role']; office: string | null; party: string | null; pins: number }>(
      `SELECT "pe"."name", "pe"."photoUrl", "pe"."role", "pe"."office", "pe"."party",
         (SELECT count(*)::int FROM "PinPerson" AS "pp" JOIN "Pin" ON "Pin"."id" = "pp"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
           WHERE "pp"."personId" = "pe"."id") AS "pins"
       FROM "Person" AS "pe" WHERE ${where.join(' AND ')}
       ORDER BY 6 DESC, "pe"."name" LIMIT ${add(limit)}`,
      params,
    );
    return rows.map((r) => ({ name: r.name, photoUrl: r.photoUrl, line: [r.office, r.party].filter(Boolean).join(' · '), count: r.pins }));
  }

  // The person a person: term names, spelled as their name or their slug (the
  // filter in pins.ts matches either), for the search page's panel.
  static async forSearch(term: string) {
    const rows = await db.query<Pick<PersonSummary, 'id' | 'name' | 'slug' | 'role' | 'office' | 'party' | 'photoUrl'> & { description: string | null; wikiUrl: string | null }>(
      `SELECT "id", "name", "slug", "role", "office", "party", "photoUrl", "description", "wikiUrl"
       FROM "Person" WHERE lower("name") = $1 OR "slug" = $1 LIMIT 1`,
      [term.trim().toLowerCase()],
    );
    return rows[0] ?? null;
  }

  static async idBySlug(slug: string): Promise<number | null> {
    const rows = await db.query<{ id: number }>(`SELECT "id" FROM "Person" WHERE "slug" = $1`, [slug]);
    return rows[0]?.id ?? null;
  }

  static async idByBioguide(bioguideId: string): Promise<number | null> {
    const rows = await db.query<{ id: number }>(`SELECT "id" FROM "Person" WHERE "bioguideId" = $1`, [bioguideId]);
    return rows[0]?.id ?? null;
  }

  static async exists(id: number): Promise<boolean> {
    return (await db.query(`SELECT 1 FROM "Person" WHERE "id" = $1`, [id])).length > 0;
  }

  // The whole page's data, or null when there is no such person.
  static async profile(id: number): Promise<PersonProfile | null> {
    const [base] = await db.query<Base>(`SELECT ${PROFILE} FROM "Person" WHERE "id" = $1`, [id]);
    if (!base) return null;
    const [earnings, contributions, properties, trips, matters, phases, researchNotes] = await Promise.all([
      db.query<PersonEarning & { amount: string | null; amountLow: string | null; amountHigh: string | null }>(
        `SELECT "year", "kind", "label", "amount", "amountLow", "amountHigh", "currency", "sourceUrl", "note"
         FROM "PersonEarning" WHERE "personId" = $1 ORDER BY "year" DESC, "id"`,
        [id],
      ),
      db.query<PersonContribution>(
        `SELECT "kind", "title", "summary", "role", "date"::text AS "date", "reference", "importance", "sourceUrl",
                CASE WHEN "impactScores" IS NULL THEN NULL ELSE jsonb_build_object(
                  'scores', "impactScores", 'confidence', "impactConfidence", 'contested', "impactContested",
                  'basis', "impactBasis", 'evidenceUrl', "impactEvidenceUrl", 'assessedDate', "impactAssessedDate"::text) END AS "impact"
         FROM "PersonContribution" WHERE "personId" = $1 ORDER BY "id"`,
        [id],
      ),
      db.query<PersonProperty & { valueLow: string | null; valueHigh: string | null }>(
        `SELECT "name", "kind", "location", "valueLow", "valueHigh", "currency", "acquiredYear", "asOf"::text AS "asOf", "sourceUrl", "note"
         FROM "PersonProperty" WHERE "personId" = $1 ORDER BY "id"`,
        [id],
      ),
      db.query<PersonTrip>(
        `SELECT "destination", "kind", "startDate"::text AS "startDate", "endDate"::text AS "endDate", "sourceUrl", "note"
         FROM "PersonTrip" WHERE "personId" = $1 ORDER BY "startDate" DESC, "id"`,
        [id],
      ),
      db.query<PersonMatter>(
        `SELECT "kind", "title", "summary", "status", "authority", "filedDate"::text AS "filedDate", "resolvedDate"::text AS "resolvedDate", "penalty", "sourceUrl", "asOf"::text AS "asOf"
         FROM "PersonMatter" WHERE "personId" = $1 ORDER BY "id"`,
        [id],
      ),
      db.query<PersonPhase>(
        `SELECT "origin", "label", "startYear", "endYear", "summary", "axes" FROM "PersonPhase"
         WHERE "personId" = $1 ORDER BY "origin" DESC, "startYear" NULLS LAST, "id"`,
        [id],
      ),
      db.query<PersonResearchNote>(
        `SELECT "topic", "coverage", "checkedDate"::text AS "checkedDate", "note", "unciteable"
         FROM "PersonResearchNote" WHERE "personId" = $1 ORDER BY "topic"`,
        [id],
      ),
    ]);
    return {
      ...base,
      earnings: earnings.map((e) => ({ ...e, amount: whole(e.amount), amountLow: whole(e.amountLow), amountHigh: whole(e.amountHigh) })),
      contributions,
      properties: properties.map((p) => ({ ...p, valueLow: whole(p.valueLow), valueHigh: whole(p.valueHigh) })),
      trips,
      matters,
      phases,
      researchNotes,
    };
  }

  // Pins linked to the person (PinPerson), newest start first.
  static async pinIds(id: number, limit: number): Promise<number[]> {
    const rows = await db.query<{ pinId: number }>(
      `SELECT "pp"."pinId" FROM "PinPerson" AS "pp" JOIN "Pin" ON "Pin"."id" = "pp"."pinId"
       WHERE "pp"."personId" = $1 AND "Pin"."utcDeletedDateTime" IS NULL
       ORDER BY "Pin"."utcStartDateTime" DESC, "Pin"."id" DESC LIMIT $2`,
      [id, limit],
    );
    return rows.map((r) => r.pinId);
  }

  // The wiki's generated overview (0162): replaces the stored one, or removes
  // it when there is nothing to generate or hand-researched phases exist.
  static async setGeneratedPhase(id: number, phase: PersonPhase | null): Promise<void> {
    await db.transaction(async (q) => {
      await q(`DELETE FROM "PersonPhase" WHERE "personId" = $1 AND "origin" = 'generated'`, [id]);
      if (!phase) return;
      await q(
        `INSERT INTO "PersonPhase" ("personId", "label", "startYear", "endYear", "summary", "axes", "origin")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'generated') ON CONFLICT ("personId", "label") DO NOTHING`,
        [id, phase.label, phase.startYear, phase.endYear, phase.summary, JSON.stringify(phase.axes)],
      );
    });
  }

  // The highest degree recorded for a person and where it was read (0162).
  static async setEducation(id: number, level: number | null, note: string | null, sourceUrl: string | null): Promise<void> {
    await db.query(`UPDATE "Person" SET "educationLevel" = $2, "educationNote" = $3, "educationSourceUrl" = $4 WHERE "id" = $1`, [id, level, note, sourceUrl]);
  }

  // For the index's mini radars: each person with life phases, their phases
  // oldest first, each as the eight axis scores in OCTAGON_AXES order (null
  // where an axis has no evidence).
  static async radars(): Promise<Map<number, (number | null)[][]>> {
    const rows = await db.query<{ personId: number; label: string; startYear: number | null; endYear: number | null; axes: PersonPhase['axes'] }>(
      `SELECT "personId", "label", "startYear", "endYear", "axes" FROM "PersonPhase" ORDER BY "personId", "startYear" NULLS LAST, "id"`,
    );
    const byPerson = new Map<number, PersonPhase[]>();
    for (const r of rows) {
      byPerson.set(r.personId, [...(byPerson.get(r.personId) ?? []), { origin: 'hand', label: r.label, startYear: r.startYear, endYear: r.endYear, summary: null, axes: r.axes }]);
    }
    const out = new Map<number, (number | null)[][]>();
    for (const [personId, phases] of byPerson) {
      // The same rule as the page: phases with too little evidence each to
      // draw a shape are one entry here too.
      for (const phase of collapseSparsePhases(phases)) {
        const scores = OCTAGON_AXES.map((axis) => phase.axes[axis]?.score ?? null);
        // One or two scored axes are points, not a shape: the card draws them as such.
        if (!scores.some((s) => s != null)) continue;
        out.set(personId, [...(out.get(personId) ?? []), scores]);
      }
    }
    return out;
  }

  // How many live pins each person has, for the index.
  static async pinCounts(): Promise<Map<number, number>> {
    const rows = await db.query<{ personId: number; pins: number }>(
      `SELECT "pp"."personId", count(*)::int AS "pins" FROM "PinPerson" AS "pp"
       JOIN "Pin" ON "Pin"."id" = "pp"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL GROUP BY "pp"."personId"`,
    );
    return new Map(rows.map((r) => [r.personId, r.pins]));
  }

  // The person a record names, found by the ids the importers match on and
  // then by slug, so a re-run updates the same row. Returns its id.
  private static async find(q: db.QueryFn, p: PersonInput, slug: string): Promise<number | null> {
    const rows = await q<{ id: number }>(
      `SELECT "id" FROM "Person"
       WHERE ($1::varchar IS NOT NULL AND "bioguideId" = $1) OR ($2::int IS NOT NULL AND "govtrackId" = $2)
          OR ($3::varchar IS NOT NULL AND "wikidataId" = $3)
          OR ($5::text IS NOT NULL AND "wikiUrl" = $5)
          -- The same URL word is the same person only when no id says otherwise.
          OR ("slug" = $4
              AND ("bioguideId" IS NULL OR $1::varchar IS NULL OR "bioguideId" = $1)
              AND ("govtrackId" IS NULL OR $2::int IS NULL OR "govtrackId" = $2)
              AND ("wikidataId" IS NULL OR $3::varchar IS NULL OR "wikidataId" = $3))
       ORDER BY ("bioguideId" = $1) DESC NULLS LAST, ("govtrackId" = $2) DESC NULLS LAST, ("wikidataId" = $3) DESC NULLS LAST LIMIT 1`,
      [p.bioguideId ?? null, p.govtrackId ?? null, p.wikidataId ?? null, slug, p.wikiUrl ?? null],
    );
    return rows[0]?.id ?? null;
  }

  // Adds the person or updates them (the one `forcedId` names, when given:
  // a PUT to a row never lands on another). A field the input leaves null keeps the
  // stored one (COALESCE), so an importer that knows the party does not blank
  // the religion someone wrote in by hand; a list present in the input
  // replaces that list. Returns the id.
  static async save(p: PersonInput, forcedId?: number): Promise<number> {
    const base = topicSlug(p.name);
    if (!base) throw new Error(`No URL word for "${p.name}"`);
    return db.transaction(async (q) => {
      const existing = forcedId ?? (await Person.find(q, p, base));
      // A second person with the same name gets the first free "-2", "-3".
      let slug = base;
      if (existing == null) {
        for (let n = 2; (await q(`SELECT 1 FROM "Person" WHERE "slug" = $1`, [slug])).length; n += 1) slug = `${base}-${n}`;
      }
      const values = [
        p.name, slug, p.role ?? 'other', p.office ?? null, p.jurisdiction ?? null, p.party ?? null, p.politics ?? null, p.politicsSourceUrl ?? null,
        p.inOfficeSince ?? null, p.birthDate ?? null, p.deathDate ?? null, p.leftOfficeDate ?? null, p.religion ?? null, p.religionSourceUrl ?? null,
        p.weightKg ?? null, p.weightAsOf ?? null, p.weightSourceUrl ?? null, p.health ?? null, p.healthAsOf ?? null, p.healthSourceUrl ?? null,
        p.description ?? null, p.photoUrl ?? null, p.photoCredit ?? null, p.wikiUrl ?? null, p.websiteUrl ?? null,
        p.bioguideId ?? null, p.govtrackId ?? null, p.wikidataId ?? null,
      ];
      let id: number;
      if (existing == null) {
        const [row] = await q<{ id: number }>(
          `INSERT INTO "Person" ("name", "slug", "role", "office", "jurisdiction", "party", "politics", "politicsSourceUrl", "inOfficeSince", "birthDate", "deathDate", "leftOfficeDate",
             "religion", "religionSourceUrl", "weightKg", "weightAsOf", "weightSourceUrl", "health", "healthAsOf", "healthSourceUrl",
             "description", "photoUrl", "photoCredit", "wikiUrl", "websiteUrl", "bioguideId", "govtrackId", "wikidataId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
           RETURNING "id"`,
          values,
        );
        id = row.id;
      } else {
        id = existing;
        // The name and slug are kept as first written: a page URL does not
        // move because a source spells the name differently.
        await q(
          `UPDATE "Person" SET
             "role" = COALESCE($1, "role"), "office" = COALESCE($2, "office"), "jurisdiction" = COALESCE($3, "jurisdiction"), "party" = COALESCE($4, "party"),
             "politics" = COALESCE($5, "politics"), "politicsSourceUrl" = COALESCE($6, "politicsSourceUrl"),
             "inOfficeSince" = COALESCE($7, "inOfficeSince"), "birthDate" = COALESCE($8, "birthDate"), "deathDate" = COALESCE($9, "deathDate"),
             "leftOfficeDate" = COALESCE($10, "leftOfficeDate"),
             "religion" = COALESCE($11, "religion"), "religionSourceUrl" = COALESCE($12, "religionSourceUrl"),
             "weightKg" = COALESCE($13, "weightKg"), "weightAsOf" = COALESCE($14, "weightAsOf"), "weightSourceUrl" = COALESCE($15, "weightSourceUrl"),
             "health" = COALESCE($16, "health"), "healthAsOf" = COALESCE($17, "healthAsOf"), "healthSourceUrl" = COALESCE($18, "healthSourceUrl"),
             "description" = COALESCE($19, "description"), "photoUrl" = COALESCE($20, "photoUrl"), "photoCredit" = COALESCE($21, "photoCredit"),
             "wikiUrl" = COALESCE($22, "wikiUrl"), "websiteUrl" = COALESCE($23, "websiteUrl"),
             "bioguideId" = COALESCE($24, "bioguideId"), "govtrackId" = COALESCE($25, "govtrackId"), "wikidataId" = COALESCE($26, "wikidataId"),
             "utcUpdatedDateTime" = now()
           WHERE "id" = $27`,
          [p.role ?? null, ...values.slice(3), id],
        );
      }
      if (p.educationLevel != null) await q(`UPDATE "Person" SET "educationLevel" = $1, "educationNote" = $2, "educationSourceUrl" = $3 WHERE "id" = $4`, [p.educationLevel, p.educationNote ?? null, p.educationSourceUrl ?? null, id]);
      // A looked-at record with nothing in it is still a looked-at record.
      if (p.mattersCheckedDate) await q(`UPDATE "Person" SET "mattersCheckedDate" = $1 WHERE "id" = $2`, [p.mattersCheckedDate, id]);
      if (p.earnings) await Person.replaceEarnings(q, id, p.earnings);
      if (p.contributions) await Person.replaceContributions(q, id, p.contributions);
      if (p.properties) await Person.replaceProperties(q, id, p.properties);
      if (p.trips) await Person.replaceTrips(q, id, p.trips);
      if (p.matters) await Person.replaceMatters(q, id, p.matters);
      if (p.phases) await Person.replacePhases(q, id, p.phases);
      if (p.researchNotes) await Person.replaceResearchNotes(q, id, p.researchNotes);
      return id;
    }).then(async (id) => {
      // The wiki the page renders from is compiled from what was just saved.
      // A failed compile leaves the last wiki in place; `people:wiki` catches up.
      const { default: PersonWiki } = await import('./personWiki');
      await PersonWiki.rebuild(id).catch((err) => console.log(`person wiki ${id} rebuild failed:`, err));
      return id;
    });
  }

  private static async replaceEarnings(q: db.QueryFn, id: number, list: PersonEarning[]) {
    await q(`DELETE FROM "PersonEarning" WHERE "personId" = $1`, [id]);
    for (const e of list) {
      await q(
        `INSERT INTO "PersonEarning" ("personId", "year", "kind", "label", "amount", "amountLow", "amountHigh", "currency", "sourceUrl", "note")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("personId", "year", "kind", "label") DO UPDATE SET
           "amount" = EXCLUDED."amount", "amountLow" = EXCLUDED."amountLow", "amountHigh" = EXCLUDED."amountHigh",
           "currency" = EXCLUDED."currency", "sourceUrl" = EXCLUDED."sourceUrl", "note" = EXCLUDED."note"`,
        [id, e.year, e.kind, e.label, e.amount, e.amountLow, e.amountHigh, e.currency, e.sourceUrl, e.note],
      );
    }
  }

  // Replaces the list - but a hand-written row survives a list from an
  // importer: the importer's rows (origin govtrack / wikidata) are swapped,
  // and a list from a person (origin hand) replaces everything.
  private static async replaceContributions(q: db.QueryFn, id: number, list: (PersonContribution & { origin?: string })[]) {
    const fromImporter = list.length > 0 && list.every((c) => c.origin && c.origin !== 'hand');
    // A re-saved list that does not carry an assessment keeps the one already
    // made for the same contribution (0156): the assessment is research, and
    // replacing the list must not discard it.
    const kept = new Map(
      (await q<{ kind: string; title: string; reference: string | null; scores: unknown; confidence: string; contested: boolean; basis: string | null; evidence: string; assessed: string | null }>(
        `SELECT "kind", "title", "reference", "impactScores" AS "scores", "impactConfidence" AS "confidence", "impactContested" AS "contested",
                "impactBasis" AS "basis", "impactEvidenceUrl" AS "evidence", "impactAssessedDate"::text AS "assessed"
         FROM "PersonContribution" WHERE "personId" = $1 AND "impactScores" IS NOT NULL`,
        [id],
      )).map((r) => [`${r.kind}|${r.title}|${r.reference ?? ''}`, r]),
    );
    await q(`DELETE FROM "PersonContribution" WHERE "personId" = $1 ${fromImporter ? `AND "origin" <> 'hand'` : ''}`, [id]);
    for (const c of list) {
      const old = kept.get(`${c.kind}|${c.title}|${c.reference ?? ''}`);
      const impact = c.impact
        ? { scores: c.impact.scores, confidence: c.impact.confidence, contested: c.impact.contested, basis: c.impact.basis, evidence: c.impact.evidenceUrl, assessed: c.impact.assessedDate }
        : old
          ? { scores: old.scores, confidence: old.confidence, contested: old.contested, basis: old.basis, evidence: old.evidence, assessed: old.assessed }
          : null;
      await q(
        `INSERT INTO "PersonContribution" ("personId", "kind", "title", "summary", "role", "date", "reference", "importance", "sourceUrl", "origin",
            "impactScores", "impactConfidence", "impactContested", "impactBasis", "impactEvidenceUrl", "impactAssessedDate")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16)
         ON CONFLICT ("personId", "kind", "title", "reference") DO UPDATE SET
           "summary" = COALESCE(EXCLUDED."summary", "PersonContribution"."summary"), "role" = EXCLUDED."role", "date" = EXCLUDED."date",
           "importance" = EXCLUDED."importance", "sourceUrl" = EXCLUDED."sourceUrl",
           "impactScores" = COALESCE(EXCLUDED."impactScores", "PersonContribution"."impactScores"),
           "impactConfidence" = COALESCE(EXCLUDED."impactConfidence", "PersonContribution"."impactConfidence"),
           "impactContested" = EXCLUDED."impactContested" OR "PersonContribution"."impactContested",
           "impactBasis" = COALESCE(EXCLUDED."impactBasis", "PersonContribution"."impactBasis"),
           "impactEvidenceUrl" = COALESCE(EXCLUDED."impactEvidenceUrl", "PersonContribution"."impactEvidenceUrl"),
           "impactAssessedDate" = COALESCE(EXCLUDED."impactAssessedDate", "PersonContribution"."impactAssessedDate")`,
        [
          id, c.kind, c.title, c.summary, c.role, c.date, c.reference, c.importance, c.sourceUrl, c.origin ?? 'hand',
          impact ? JSON.stringify(impact.scores) : null, impact?.confidence ?? null, impact?.contested ?? false, impact?.basis ?? null, impact?.evidence ?? null, impact?.assessed ?? null,
        ],
      );
    }
  }

  private static async replaceProperties(q: db.QueryFn, id: number, list: PersonProperty[]) {
    await q(`DELETE FROM "PersonProperty" WHERE "personId" = $1`, [id]);
    for (const p of list) {
      await q(
        `INSERT INTO "PersonProperty" ("personId", "name", "kind", "location", "valueLow", "valueHigh", "currency", "acquiredYear", "asOf", "sourceUrl", "note")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("personId", "name") DO UPDATE SET
           "kind" = EXCLUDED."kind", "location" = EXCLUDED."location", "valueLow" = EXCLUDED."valueLow", "valueHigh" = EXCLUDED."valueHigh",
           "currency" = EXCLUDED."currency", "acquiredYear" = EXCLUDED."acquiredYear", "asOf" = EXCLUDED."asOf",
           "sourceUrl" = EXCLUDED."sourceUrl", "note" = EXCLUDED."note"`,
        [id, p.name, p.kind, p.location, p.valueLow, p.valueHigh, p.currency, p.acquiredYear, p.asOf, p.sourceUrl, p.note],
      );
    }
  }

  private static async replacePhases(q: db.QueryFn, id: number, list: PersonPhase[]) {
    // Only the hand-researched phases are replaced: the generated overview
    // belongs to the wiki, which rebuilds it (setGeneratedPhase).
    await q(`DELETE FROM "PersonPhase" WHERE "personId" = $1 AND "origin" = 'hand'`, [id]);
    for (const ph of list) {
      await q(
        `INSERT INTO "PersonPhase" ("personId", "label", "startYear", "endYear", "summary", "axes", "origin")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'hand')
         ON CONFLICT ("personId", "label") DO UPDATE SET
           "startYear" = EXCLUDED."startYear", "endYear" = EXCLUDED."endYear", "summary" = EXCLUDED."summary",
           "axes" = EXCLUDED."axes", "origin" = 'hand'`,
        [id, ph.label, ph.startYear, ph.endYear, ph.summary, JSON.stringify(ph.axes)],
      );
    }
  }

  // One note per topic: the list sent is the notes the person now has.
  private static async replaceResearchNotes(q: db.QueryFn, id: number, list: PersonResearchNote[]) {
    await q(`DELETE FROM "PersonResearchNote" WHERE "personId" = $1`, [id]);
    for (const n of list) {
      await q(
        `INSERT INTO "PersonResearchNote" ("personId", "topic", "coverage", "checkedDate", "note", "unciteable")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT ("personId", "topic") DO UPDATE SET
           "coverage" = EXCLUDED."coverage", "checkedDate" = EXCLUDED."checkedDate", "note" = EXCLUDED."note", "unciteable" = EXCLUDED."unciteable"`,
        [id, n.topic, n.coverage, n.checkedDate, n.note, JSON.stringify(n.unciteable)],
      );
    }
  }

  private static async replaceMatters(q: db.QueryFn, id: number, list: PersonMatter[]) {
    await q(`DELETE FROM "PersonMatter" WHERE "personId" = $1`, [id]);
    for (const m of list) {
      await q(
        `INSERT INTO "PersonMatter" ("personId", "kind", "title", "summary", "status", "authority", "filedDate", "resolvedDate", "penalty", "sourceUrl", "asOf")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("personId", "title", "authority") DO UPDATE SET
           "kind" = EXCLUDED."kind", "summary" = EXCLUDED."summary", "status" = EXCLUDED."status", "filedDate" = EXCLUDED."filedDate",
           "resolvedDate" = EXCLUDED."resolvedDate", "penalty" = EXCLUDED."penalty", "sourceUrl" = EXCLUDED."sourceUrl", "asOf" = EXCLUDED."asOf"`,
        [id, m.kind, m.title, m.summary, m.status, m.authority, m.filedDate, m.resolvedDate, m.penalty, m.sourceUrl, m.asOf],
      );
    }
  }

  private static async replaceTrips(q: db.QueryFn, id: number, list: PersonTrip[]) {
    await q(`DELETE FROM "PersonTrip" WHERE "personId" = $1`, [id]);
    for (const t of list) {
      await q(
        `INSERT INTO "PersonTrip" ("personId", "destination", "kind", "startDate", "endDate", "sourceUrl", "note")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("personId", "destination", "startDate") DO UPDATE SET
           "kind" = EXCLUDED."kind", "endDate" = EXCLUDED."endDate", "sourceUrl" = EXCLUDED."sourceUrl", "note" = EXCLUDED."note"`,
        [id, t.destination, t.kind, t.startDate, t.endDate, t.sourceUrl, t.note],
      );
    }
  }

  // Links pins to the person by hand or by `people:link-pins`.
  static async linkPins(id: number, pinIds: number[]): Promise<number> {
    if (!pinIds.length) return 0;
    const rows = await db.query(
      `INSERT INTO "PinPerson" ("pinId", "personId")
       SELECT "p"."id", $1 FROM "Pin" AS "p" WHERE "p"."id" = ANY($2::int[])
       ON CONFLICT DO NOTHING RETURNING 1`,
      [id, pinIds],
    );
    return rows.length;
  }

  // Seeding (npm run backup:data / create:data): every table row for row, ids
  // included, so a rebuilt database has the same pages and the same pin links.
  static async backupAll(): Promise<Record<string, db.Row[]>> {
    const [people, earnings, contributions, properties, trips, matters, phases, notes, pins, holdings] = await Promise.all(
      TABLES.map((table) => db.query(`SELECT * FROM "${table}" ORDER BY ${table === 'PinPerson' ? '"personId", "pinId"' : table === 'PersonHoldings' ? '"personId"' : '"id"'}`)),
    );
    return { people, earnings, contributions, properties, trips, matters, phases, notes, pins, holdings };
  }

  static async restoreAll(data: Record<string, db.Row[]> | null | undefined): Promise<void> {
    if (!data) return;
    const keys = ['people', 'earnings', 'contributions', 'properties', 'trips', 'matters', 'phases', 'notes', 'pins', 'holdings'] as const;
    for (const [i, key] of keys.entries()) {
      const rows = data[key] ?? [];
      const table = TABLES[i];
      for (let at = 0; at < rows.length; at += 500) {
        const part = JSON.stringify(rows.slice(at, at + 500));
        // A pin link whose pin is not in this database is left out.
        const filter = table === 'PinPerson' ? ` WHERE EXISTS (SELECT 1 FROM "Pin" WHERE "Pin"."id" = "r"."pinId")` : '';
        await db.query(
          `INSERT INTO "${table}" ${table === 'PinPerson' ? '' : 'OVERRIDING SYSTEM VALUE'}
           SELECT "r".* FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb) AS "r"${filter} ON CONFLICT DO NOTHING`,
          [part],
        );
      }
    }
    for (const table of TABLES.filter((t) => t !== 'PinPerson' && t !== 'PersonHoldings')) {
      await db.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT max("id") FROM "${table}"), 1))`);
    }
    // The wikis are compiled, not seeded.
    const { default: PersonWiki } = await import('./personWiki');
    await PersonWiki.rebuildAll();
  }
}

// In dependency order: a person first, then what hangs off them.
const TABLES = ['Person', 'PersonEarning', 'PersonContribution', 'PersonProperty', 'PersonTrip', 'PersonMatter', 'PersonPhase', 'PersonResearchNote', 'PinPerson', 'PersonHoldings'] as const;
