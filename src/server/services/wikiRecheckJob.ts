import { recheckOff } from '@/lib/wikiRecheck';
import { claimWikiRecheckRun, getWikiRecheck } from '../model/appSetting';
import log from '../util/log';
import { runLint } from './okfLint';

// The nightly re-read of pins' links (docs/okf/playbooks/lint-the-wikis.md):
// okf:lint's stale check with --fix, at UTC midnight, per the admin's
// wikiRecheck setting: links of pins viewed during the day that has just
// ended, and links last read over the setting's days ago - either or both.
//
// It runs in the server process: every CHECK_MS each server tries to claim
// the new UTC day, and the one that wins runs it, so it happens once however
// many servers there are, and a night the servers were down is caught up by
// the first check after they come back (still counting only views from
// before that midnight).

const CHECK_MS = 10 * 60 * 1000;

const g = globalThis as unknown as { __chronopinWikiRecheckTimer?: ReturnType<typeof setInterval> };

export const utcDay = (date: Date) => date.toISOString().slice(0, 10);

export async function runNightlyRecheck(now = new Date()): Promise<boolean> {
  if (recheckOff(await getWikiRecheck())) return false;
  const today = utcDay(now);
  if (!(await claimWikiRecheckRun(today))) return false;
  const midnight = new Date(`${today}T00:00:00Z`);
  const report = await runLint({ checks: ['stale'], fix: true, viewedBefore: midnight });
  const stale = report.stale;
  log.info(`nightly wiki re-read for ${today}: ${stale?.notes.join('; ')}${stale?.fixed.length ? `; ${stale.fixed.join('; ')}` : ''}`);
  return true;
}

export function startWikiRecheckSchedule() {
  if (g.__chronopinWikiRecheckTimer) return;
  const tick = () => void runNightlyRecheck().catch((err) => log.warn('nightly wiki re-read failed:', (err as Error).message));
  g.__chronopinWikiRecheckTimer = setInterval(tick, CHECK_MS);
  g.__chronopinWikiRecheckTimer.unref();
  tick();
}
