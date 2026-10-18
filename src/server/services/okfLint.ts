import { createHash } from 'node:crypto';
import { lintBundle, relevantChanges, wikiQualityIssues } from '@/lib/okfLint';
import * as db from '../db';
import { findContradictions } from '../extract/contradictions';
import { ServiceError } from '../extract/wiki';
import OkfLint, { type LintCheck, type LintFinding } from '../model/okfLint';
import Source, { hashText, type WikiPage } from '../model/source';
import { loadOkfBundle } from '../okf';
import { fetchSourceText } from '../scrape/sourceText';
import { ingestSource, pinLinks, refreshPin, type PinLinks } from './sourceWiki';

// Keeps the link wikis healthy (docs/okf/playbooks/lint-the-wikis.md). Each
// check writes its findings to OkfLintFinding; with fix, the ones that can be
// put right are:
//
//   conformance    the generated bundle against the OKF spec    report only (a renderer bug)
//   stale          read links again, compare their text         rewrite changed wikis, rebuild summaries
//   orphan         links no live pin cites                      delete them
//   quality        thin, blank, repetitive wikis; pins with     queue the wiki for a rewrite (once per
//                  wikis but no summary                         version); rebuild the summary
//   contradiction  Claude compares a pin's link wikis           report only (for an admin to review)

export const LINT_CHECKS: LintCheck[] = ['conformance', 'stale', 'orphan', 'quality', 'contradiction', 'imprecise', 'cluster'];

export type LintOptions = {
  checks?: LintCheck[];
  pinIds?: number[];
  fix?: boolean;
  // stale: which links to read again; without either, none (links are only
  // re-read by hand). recheckDays re-reads links last read this long ago; viewed
  // re-reads links of pins viewed since they were last read; both may be set.
  recheckDays?: number;
  viewed?: boolean;
  // stale, viewed: count only views on UTC days before this (the nightly
  // run, which covers the day that has just ended).
  viewedBefore?: Date;
  // orphan: leave links first seen more recently than this (a scrape whose
  // pin is still being written).
  orphanDays?: number;
  // stale and contradiction: at most this many links / pins per run.
  limit?: number;
};

export type CheckReport = { findings: LintFinding[]; fixed: string[]; notes: string[] };
export type LintReport = Partial<Record<LintCheck, CheckReport>>;

const newReport = (): CheckReport => ({ findings: [], fixed: [], notes: [] });

export async function runLint(options: LintOptions = {}): Promise<LintReport> {
  const checks = options.checks ?? LINT_CHECKS;
  const report: LintReport = {};
  const refresh = new Set<number>();
  for (const check of LINT_CHECKS.filter((c) => checks.includes(c))) {
    report[check] = await CHECKS[check](options, refresh);
  }
  // Pins whose links a fix changed: rewrite their queued wikis and rebuild
  // their summaries now rather than on their next save.
  for (const pinId of refresh) {
    await refreshPin(pinId);
  }
  return report;
}

const CHECKS: Record<LintCheck, (options: LintOptions, refresh: Set<number>) => Promise<CheckReport>> = {
  conformance: lintConformance,
  stale: lintStale,
  orphan: lintOrphans,
  quality: lintQuality,
  contradiction: lintContradictions,
  imprecise: lintImprecise,
  cluster: lintCluster,
};

// A date only as precise as the year its source gave. The convention puts a
// bare year on 31 December, which is a placeholder for "some time that year",
// not a claim about the day - so these are the pins where one better reference
// buys the most: a later article naming the month or the day retires a whole
// year of uncertainty. Only pins still ahead of us are worth chasing; a bare
// year on something that happened in 1150 is as good as it will ever get.
// Only estimated and delayed dates qualify: a scheduled one is a day somebody
// announced, so a scheduled pin landing on 1 January or 31 December is there
// because the event is (a line opening on New Year's Day, a statutory deadline
// on the last of December), not because nobody knew the day.
// Nothing here fetches or calls Claude, so it runs on every lint.
const YEAR_END = '12-31';
const YEAR_START = '01-01';

async function lintImprecise({ pinIds }: LintOptions): Promise<CheckReport> {
  const out = newReport();
  const rows = await db.query<{ id: number; title: string; day: string; conf: string }>(
    `SELECT p."id", p."title", to_char(p."utcStartDateTime", 'YYYY-MM-DD') AS day, p."dateConfidence" AS conf
     FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL AND p."allDay"
       AND p."dateConfidence" IN ('estimated', 'delayed')
       AND to_char(p."utcStartDateTime", 'MM-DD') IN ($1, $2)
       AND p."utcStartDateTime" > now()
       AND ($3::int[] IS NULL OR p."id" = ANY($3::int[]))
     ORDER BY p."utcStartDateTime"`,
    [YEAR_END, YEAR_START, pinIds ?? null],
  );
  out.findings = rows.map((row) => ({
    check: 'imprecise' as const,
    severity: 'info' as const,
    pinId: row.id,
    message: `Date is year-precision only (${row.day.slice(0, 4)}, ${row.conf}); check back for a reference that names the month or the day`,
    detail: { day: row.day, dateConfidence: row.conf },
  }));
  await OkfLint.replace('imprecise', out.findings, pinIds ? { pinIds, sourceIds: [] } : undefined);
  out.notes.push(`${rows.length} pin(s) dated to a year alone`);
  return out;
}

// Pins piled onto one day by a scrape that had no date to read. The Gear Patrol
// run of 2026-09-20 put 71 pins on 2026-09-08, 65 of them 'confirmed', because
// the roundup called each product "already available" and the extractor turned
// that bound into a release day (see docs/okf/scraping/learnings.md).
//
// Volume alone does not identify it, because real clusters exist: a season's
// anime premieres share a simulcast day, and a month-only availability line
// properly puts a dozen pins on a month's last day. Those come from one
// aggregator, or are honestly 'estimated'. An invented date is the combination -
// many pins, several unrelated source hosts, and a majority calling itself
// 'confirmed'. Year-end and year-start placeholders are excluded outright: those
// are the house convention for "some time that year".
//
// Nothing here fetches or calls Claude, so it runs on every lint.
const CLUSTER_MIN_PINS = 8;
const CLUSTER_MIN_HOSTS = 4;
const CLUSTER_MIN_CONFIRMED = 0.6;

async function lintCluster({ pinIds }: LintOptions): Promise<CheckReport> {
  const out = newReport();
  const rows = await db.query<{ day: string; userId: number; userName: string; n: number; hosts: number; confirmed: number; ids: number[] }>(
    `SELECT to_char(p."utcStartDateTime", 'YYYY-MM-DD') AS "day", u."id" AS "userId", u."userName" AS "userName",
            COUNT(*)::int AS "n",
            COUNT(DISTINCT split_part(split_part(p."sourceUrl", '//', 2), '/', 1))::int AS "hosts",
            COUNT(*) FILTER (WHERE p."dateConfidence" = 'confirmed')::int AS "confirmed",
            ARRAY_AGG(p."id" ORDER BY p."id") AS "ids"
     FROM "Pin" p JOIN "User" u ON u."id" = p."userId"
     WHERE p."utcDeletedDateTime" IS NULL AND p."allDay"
       AND to_char(p."utcStartDateTime", 'MM-DD') NOT IN ($1, $2)
       AND ($3::int[] IS NULL OR p."id" = ANY($3::int[]))
     GROUP BY 1, 2, 3
     HAVING COUNT(*) >= $4::int
        AND COUNT(DISTINCT split_part(split_part(p."sourceUrl", '//', 2), '/', 1)) >= $5::int
        AND COUNT(*) FILTER (WHERE p."dateConfidence" = 'confirmed')::numeric >= $4::numeric * $6::numeric
     ORDER BY COUNT(*) DESC`,
    [YEAR_END, YEAR_START, pinIds ?? null, CLUSTER_MIN_PINS, CLUSTER_MIN_HOSTS, CLUSTER_MIN_CONFIRMED],
  );
  out.findings = rows.flatMap((row) =>
    row.ids.map((id) => ({
      check: 'cluster' as const,
      severity: 'warning' as const,
      pinId: id,
      message: `${row.n} of ${row.userName}'s pins start on ${row.day}, from ${row.hosts} different sites, ${row.confirmed} of them confirmed - check the date was read from each page and not from the article that listed them`,
      detail: { day: row.day, pins: row.n, hosts: row.hosts, confirmed: row.confirmed, author: row.userName, pinIds: row.ids },
    })),
  );
  await OkfLint.replace('cluster', out.findings, pinIds ? { pinIds, sourceIds: [] } : undefined);
  out.notes.push(rows.length ? `${rows.length} suspicious date cluster(s): ${rows.map((r) => `${r.day} x${r.n}`).join(', ')}` : 'no suspicious date clusters');
  return out;
}

// The ids a bundle path is about: pins/930-x.md, sources/12-y/1-z.md.
const idOf = (path: string, dir: 'pins' | 'sources') => {
  const match = path.match(new RegExp(`^${dir}/(\\d+)-`));
  return match ? Number(match[1]) : null;
};

async function lintConformance({ pinIds }: LintOptions): Promise<CheckReport> {
  const out = newReport();
  const files = await loadOkfBundle(pinIds);
  out.findings = lintBundle(files).map((issue) => ({
    check: 'conformance',
    severity: issue.severity,
    pinId: idOf(issue.path, 'pins'),
    sourceId: idOf(issue.path, 'sources'),
    path: issue.path,
    message: issue.message,
  }));
  // Bundle-wide files (index.md, log.md) belong to no pin, so a --pin run
  // cannot scope them; it leaves earlier findings alone and only adds.
  await OkfLint.replace('conformance', out.findings, pinIds ? { pinIds, sourceIds: [] } : undefined);
  out.notes.push(`${files.size} file(s) checked`);
  return out;
}

async function lintStale({ pinIds, fix, limit = 50, viewedBefore, ...options }: LintOptions, refresh: Set<number>): Promise<CheckReport> {
  const out = newReport();
  const rule = { viewed: !!options.viewed, days: options.recheckDays ?? null };
  if (!rule.viewed && rule.days == null) {
    // Earlier stale findings stand until links are read again.
    out.notes.push('skipped: no links asked for (pass --viewed / --recheck-days)');
    return out;
  }
  const due = await Source.dueForRecheck({
    viewed: rule.viewed ? { before: viewedBefore } : undefined,
    olderThanDays: rule.days,
    pinIds,
    limit,
  });
  const wikis = await Source.wikis(due.map((s) => s.id));
  let unchanged = 0;
  let furniture = 0;
  for (const source of due) {
    let fetched;
    try {
      fetched = await fetchSourceText(source.url, source.kind);
    } catch (err) {
      // The wiki still holds; the link may have moved or died.
      out.findings.push({ check: 'stale', severity: 'warning', sourceId: source.id, message: `could not read the link again: ${(err as Error).message}`, detail: { url: source.url } });
      continue;
    }
    if (source.textHash === hashText(fetched.text)) {
      await Source.markUnchanged(source.id);
      unchanged++;
      continue;
    }
    // Only a change to what the wiki is about is worth a rewrite; a rotating
    // sidebar just becomes the new baseline.
    const stored = (await Source.getById(source.id))?.text ?? '';
    const wiki = wikis.get(source.id);
    const relevant = wiki ? relevantChanges(stored, fetched.text, wikiText(wiki)) : ['(no wiki to compare with)'];
    if (!relevant.length) {
      await Source.setText(source.id, fetched);
      await Source.markUnchanged(source.id);
      furniture++;
      continue;
    }
    out.findings.push({
      check: 'stale',
      severity: 'warning',
      sourceId: source.id,
      message: `the link has changed since its wiki was written (${relevant.length} line(s) about its subject)`,
      detail: { url: source.url, lines: relevant.slice(0, 5).map((l) => l.slice(0, 300)) },
    });
    if (fix) {
      const result = await ingestSource(source.id, { refetch: true, fetched });
      out.fixed.push(`source ${source.id}: ${result === 'built' ? 'wiki rewritten' : `queued (${result})`}`);
      (await Source.citingPins([source.id])).forEach((id) => refresh.add(id));
    }
  }
  // Only the links read this run have a new answer; the rest keep theirs.
  await OkfLint.replace(
    'stale',
    out.findings,
    { sourceIds: due.map((s) => s.id) },
  );
  const why = [rule.viewed ? 'pin viewed since last read' : '', rule.days != null ? `last read over ${rule.days} day${rule.days === 1 ? '' : 's'} ago` : '']
    .filter(Boolean)
    .join(' or ');
  out.notes.push(`${due.length} link(s) due (${why}): ${unchanged} unchanged, ${furniture} changed only outside their subject`);
  return out;
}

// Every page of a wiki as one text, for comparing a link's changes against.
const wikiText = (page: WikiPage): string => [page.title, page.summary, page.body, ...page.children.map(wikiText)].join('\n');

async function lintOrphans({ pinIds, fix, orphanDays = 7 }: LintOptions): Promise<CheckReport> {
  const out = newReport();
  if (pinIds) {
    out.notes.push('skipped: orphans belong to no pin, so a --pin run does not look for them');
    return out;
  }
  const orphans = await Source.orphans(orphanDays);
  out.findings = orphans.map((o) => ({
    check: 'orphan',
    severity: 'info',
    sourceId: o.id,
    message: `no live pin cites this link (first seen ${new Date(o.utcCreatedDateTime).toISOString().slice(0, 10)})`,
    detail: { url: o.url, status: o.status },
  }));
  if (fix && orphans.length) {
    await Source.deleteIds(orphans.map((o) => o.id));
    out.fixed.push(`deleted ${orphans.length} link(s) and their wikis`);
    out.findings = [];
  }
  await OkfLint.replace('orphan', out.findings);
  return out;
}

async function lintQuality({ pinIds, fix }: LintOptions, refresh: Set<number>): Promise<CheckReport> {
  const out = newReport();
  const sources = await Source.ready(pinIds);
  const wikis = await Source.wikis(sources.map((s) => s.id));
  for (const source of sources) {
    const wiki = wikis.get(source.id);
    if (!wiki) continue;
    const issues = wikiQualityIssues(wiki, source.textLength);
    issues.forEach((issue) => out.findings.push({ check: 'quality', severity: issue.severity, sourceId: source.id, message: issue.message, detail: { url: source.url, wikiVersion: source.wikiVersion } }));
    // A rewrite is queued once per wiki version: if the new one comes out the
    // same, it is reported, not rewritten forever.
    if (fix && issues.some((i) => i.severity === 'warning')) {
      const signature = String(source.wikiVersion);
      if ((await OkfLint.scanned('quality', source.id)) !== signature) {
        await Source.markPending(source.id);
        await OkfLint.markScanned('quality', source.id, signature);
        out.fixed.push(`source ${source.id}: queued for a rewrite`);
        (await Source.citingPins([source.id])).forEach((id) => refresh.add(id));
      }
    }
  }

  // Pins whose links have wikis but that have no summary at all.
  const bare = await db.query<{ id: number }>(
    `SELECT DISTINCT "Pin"."id" FROM "Pin"
       JOIN "PinSource" ON "PinSource"."pinId" = "Pin"."id" AND "PinSource"."utcRemovedDateTime" IS NULL
       JOIN "Source" ON "Source"."id" = "PinSource"."sourceId" AND "Source"."wikiVersion" > 0
     WHERE "Pin"."utcDeletedDateTime" IS NULL AND COALESCE(btrim("Pin"."longFormSummary"), '') = ''
       AND ($1::integer[] IS NULL OR "Pin"."id" = ANY($1::integer[]))
     ORDER BY 1`,
    [pinIds ?? null],
  );
  for (const { id } of bare) {
    out.findings.push({ check: 'quality', severity: 'warning', pinId: id, message: 'the pin has link wikis but no summary' });
    if (fix) {
      const { rebuilt } = await refreshPin(id, { rebuild: true });
      out.fixed.push(`pin ${id}: ${rebuilt ? 'summary written' : 'summary not written (see wiki:sync)'}`);
    }
  }
  await OkfLint.replace('quality', out.findings, pinIds ? { pinIds, sourceIds: sources.map((s) => s.id) } : undefined);
  return out;
}

// What a contradiction check of a pin covers: its own facts and each link's
// wiki version. The same signature is not checked twice.
export function contradictionSignature(found: PinLinks): string {
  const { about, links } = found;
  const key = JSON.stringify([
    about.title,
    about.description ?? null,
    new Date(about.utcStartDateTime).toISOString(),
    about.utcEndDateTime ? new Date(about.utcEndDateTime).toISOString() : null,
    links.map((l) => `${l.label}:${l.sourceId}:${l.wikiVersion}`).sort(),
  ]);
  return createHash('sha256').update(key).digest('hex').slice(0, 64);
}

// Live pins with two or more link wikis whose current signature has not been
// checked yet, with what to check them from.
export async function pinsDueForContradictionCheck(pinIds: number[] | undefined, limit: number) {
  const candidates = await db.query<{ pinId: number }>(
    `SELECT "PinSource"."pinId" FROM "PinSource"
       JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       JOIN "Source" ON "Source"."id" = "PinSource"."sourceId" AND "Source"."wikiVersion" > 0
     WHERE "PinSource"."utcRemovedDateTime" IS NULL AND ($1::integer[] IS NULL OR "PinSource"."pinId" = ANY($1::integer[]))
     GROUP BY 1 HAVING COUNT(*) >= 2 ORDER BY 1`,
    [pinIds ?? null],
  );
  const due: { pinId: number; signature: string; found: PinLinks }[] = [];
  for (const { pinId } of candidates) {
    if (due.length >= limit) break;
    const found = await pinLinks(pinId);
    if (!found || found.links.length < 2) continue;
    const signature = contradictionSignature(found);
    if ((await OkfLint.scanned('contradiction', pinId)) !== signature) due.push({ pinId, signature, found });
  }
  return due;
}

// Stores one pin's contradiction check, however it was made (Claude here, or
// by hand through wiki:apply).
export async function saveContradictions(
  pinId: number,
  signature: string,
  contradictions: { subject: string; severity: 'major' | 'minor'; claims: { label: string; says: string }[]; note: string | null }[],
  labels: Record<string, string>,
) {
  const findings: LintFinding[] = contradictions.map((c) => ({
    check: 'contradiction',
    severity: c.severity === 'major' ? 'warning' : 'info',
    pinId,
    message: `${c.subject}: ${c.claims.map((claim) => `[${claim.label}] ${claim.says}`).join(' vs ')}`,
    detail: { ...c, links: Object.fromEntries(c.claims.map((claim) => [claim.label, labels[claim.label] ?? (claim.label === 'P' ? 'the pin' : null)])) },
  }));
  await OkfLint.replace('contradiction', findings, { pinIds: [pinId] });
  await OkfLint.markScanned('contradiction', pinId, signature);
  return findings;
}

async function lintContradictions({ pinIds, limit = 50 }: LintOptions): Promise<CheckReport> {
  const out = newReport();
  const due = await pinsDueForContradictionCheck(pinIds, limit);
  let checked = 0;
  for (const { pinId, signature, found } of due) {
    let contradictions;
    try {
      contradictions = await findContradictions(found.about, found.links);
    } catch (err) {
      if (err instanceof ServiceError) {
        out.notes.push(`stopped: ${err.message}`);
        break;
      }
      out.notes.push(`pin ${pinId}: ${(err as Error).message}`);
      continue;
    }
    if (contradictions === null) {
      out.notes.push('stopped: no Anthropic API key');
      break;
    }
    checked++;
    const labels = Object.fromEntries(found.links.map((l) => [l.label, l.url]));
    out.findings.push(...(await saveContradictions(pinId, signature, contradictions, labels)));
  }
  const left = due.length - checked;
  out.notes.push(
    `${checked} pin(s) checked${left ? `, ${left} still due - check them by hand with npm run wiki:export / wiki:apply` : ''}; pins unchanged since their last check keep its findings`,
  );
  return out;
}
