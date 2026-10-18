// Applies researched radar data (agent JSON, one object per person) to the
// local DB: the legal/ethics matters it found (with the day they were looked
// for), and the researched axes (standing, health, social, economic) merged
// into the person's radar.
//
//   npm run people:radar -- out/*.json            apply
//   npm run people:radar -- out/*.json --dry-run  validate and count
//   npm run people:radar -- out/*.json --skip-hosts fox5dc.com,fox2detroit.com
//
// A file's "mattersChecked: true" with no matters is not stored (a shallow
// search found nothing, which does not make a record clean); only people with
// at least one sourced matter get a checked date and a misconduct axis.
//
// File entries: { id, name, matters?, mattersChecked?, axes?, note? }. Matters
// go through readMatter (an https source and a status, or the row is dropped);
// axes through readPhase (a score 0..5, a confidence and an https evidence
// URL, or the axis is dropped). Only the four researched axes are read from a
// file: position, education, wealth and misconduct are generated from the
// stored record.
//
// A person with no researched phases gets one hand phase, "Overview": the
// generated axes as of today plus the researched ones. A person who already
// has researched phases (the presidents) gets the missing axes added to their
// latest phase - a researched axis never overwrites one already scored.
// Re-running regenerates the generated axes and keeps the researched ones.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import { readMatter, readPhase } from '@/server/personInput';
import { generateOverview, type OctagonAxis, type PersonPhase } from '@/lib/people';

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'dry-run': { type: 'boolean', default: false },
    // Axes and matters citing these hosts (comma-separated, e.g. a local TV
    // station relaying a Gallup result, or a Substack) are dropped: cite the
    // pollster, court or agency itself.
    'skip-hosts': { type: 'string' },
  },
});
const skipHosts = (flags['skip-hosts'] ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
const skipped = (url: unknown) => {
  try {
    const host = new URL(String(url)).hostname.toLowerCase();
    return skipHosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return true;
  }
};

const RESEARCHED: OctagonAxis[] = ['standing', 'health', 'social', 'economic'];
type Entry = { id: number; name: string; matters?: Record<string, unknown>[]; mattersChecked?: boolean; axes?: Record<string, unknown>; note?: string };

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const stats = { people: 0, matters: 0, checked: 0, axes: 0 };
  for (const file of positionals) {
    const entries = JSON.parse(readFileSync(file, 'utf8')) as Entry[];
    for (const e of entries) {
      const stored = await Person.profile(e.id);
      if (!stored || stored.name !== e.name) {
        console.log(`skip ${e.id} ${e.name}: not found or renamed`);
        continue;
      }
      // Matters: only for a person nobody has reviewed, so a hand review is never replaced.
      // Only a search that found something is stored: an empty "checked" from
      // a shallow search would read as a clean record, which nobody has shown.
      // Added to what is stored, never replacing it: the same source and title
      // is not added twice, and an earlier hand review keeps every row.
      const have = new Set(stored.matters.map((m) => `${m.sourceUrl}|${m.title}`));
      const found = e.mattersChecked
        ? (e.matters ?? []).filter((m) => !skipped(m.sourceUrl)).flatMap((m) => readMatter(m) ?? []).filter((m) => !have.has(`${m.sourceUrl}|${m.title}`))
        : [];
      const matters = found.length ? [...stored.matters, ...found] : null;
      // Researched axes, validated as a one-phase radar would be.
      const kept = Object.fromEntries(Object.entries(e.axes ?? {}).filter(([, a]) => !skipped((a as { evidenceUrl?: unknown }).evidenceUrl)));
      const phase = Object.keys(kept).length ? readPhase({ label: 'Overview', axes: kept }) : null;
      const researched = Object.fromEntries(Object.entries(phase?.axes ?? {}).filter(([axis]) => RESEARCHED.includes(axis as OctagonAxis))) as PersonPhase['axes'];
      stats.people += 1;
      if (matters) {
        stats.checked += 1;
        stats.matters += found.length;
      }
      stats.axes += Object.keys(researched).length;
      if (flags['dry-run'] || (!matters && !Object.keys(researched).length)) continue;

      if (matters) await Person.save({ name: stored.name, matters, mattersCheckedDate: stored.mattersCheckedDate ?? today }, e.id);
      const fresh = (await Person.profile(e.id))!;
      const hand = fresh.phases.filter((p) => p.origin !== 'generated');
      const generated = generateOverview({ ...fresh, phases: [] } as typeof fresh)?.axes ?? {};
      let phases: PersonPhase[];
      if (!hand.length) {
        const axes = { ...generated, ...researched };
        if (Object.keys(axes).length === 0) continue;
        phases = [{ label: 'Overview', startYear: null, endYear: null, summary: 'Generated from documented data, with researched axes added.', axes, origin: 'hand' }];
      } else {
        // Latest researched phase takes the axes it lacks; the misconduct axis only if the record was reviewed.
        const last = [...hand].sort((a, b) => (a.startYear ?? -9999) - (b.startYear ?? -9999)).at(-1)!;
        const add = { ...researched, ...(generated.misconduct ? { misconduct: generated.misconduct } : {}) };
        const axes = { ...add, ...last.axes };
        phases = hand.map((p) => (p === last ? { ...p, axes } : p));
      }
      await Person.save({ name: stored.name, phases }, e.id);
    }
  }
  console.log(JSON.stringify(stats));
  await db.closeConnection();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
