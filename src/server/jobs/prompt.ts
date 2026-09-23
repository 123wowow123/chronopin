// A daily job's instructions, built from the OKF docs at run time, so the
// strategy a run follows is the one written down - and a learning folded into
// docs/okf/scraping changes the next run with no code change.
//
// The system prompt is the stable part (it is the same for every run of the
// same docs, so the API caches it); the run's own particulars - the date, the
// tasks, the limits, what earlier runs learned - go in the first user turn.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TASKS, type JobSetting } from '@/lib/dailyJobs';
import JobRun from '../model/jobRun';
import { OKF_ROOT, type JobContext } from './tools';

// The pages every run reads whole: the job guidance itself, then the strategy
// and quality bar every pin meets. The rest are a read_okf call away.
const CORE_PAGES = ['scraping/daily-jobs.md', 'scraping/strategy.md'];
const LEARNINGS_IN_PROMPT = 25;

async function page(relative: string): Promise<string | null> {
  try {
    const text = await readFile(path.join(OKF_ROOT, relative), 'utf8');
    return `<okf path="docs/okf/${relative}">\n${text.replace(/^---\n[\s\S]*?\n---\n/, '')}\n</okf>`;
  } catch {
    return null;
  }
}

export type Driver = 'api' | 'session';

export async function systemPrompt(driver: Driver): Promise<string> {
  const pages = (await Promise.all(CORE_PAGES.map(page))).filter(Boolean);
  const nativeTools =
    driver === 'api'
      ? 'your web_search and web_fetch tools (web_fetch reads PDFs too)'
      : 'your WebSearch and WebFetch tools';
  return [
    `You run Chronopin's daily pin jobs. Chronopin is a timeline and map of dated events: every pin is one thing that happens (a launch, an opening, a release, a ruling) at a date and usually a place, with its sources, pictures and a cited summary.`,
    `A job run has two halves. Maintenance keeps the pins that exist accurate: dates that firmed up or slipped, sources that appeared since, media that broke. Growth adds pins for major events the timeline is missing. Both follow the strategy below, which is the owner's standing guidance - where it and your own judgement differ, it wins.`,
    `Research with ${nativeTools}. The chronopin tools give you the app's data, its writes, and what you cannot do natively (a headless Chrome render, the app's full scrape, the image processor). Never type a URL from memory: every source, reference and picture must have come back from a search or fetch in this run.`,
    `Work like this:
- Read the signals for each task first, then decide. Prefer a few well-vetted pins over many thin ones; the run has limits on new pins and updates, and reaching them is not the goal.
- Before creating a pin, run find_pins for the subject and its source URL. A second source for something already pinned is a reference on that pin, never a second pin.
- Draft a new pin with scrape_url on its best source, then check it against the quality bar before create_pin. Post it as the curator whose vertical fits.
- update_pin only edits pins a curator posted. For anyone else's pin, or anything you cannot finish, use mark_revisit with exactly what should change.
- When something surprises you - a source that blocks, a rule that misfired, a task that had nothing worth doing and why - call record_learning. Future runs read it.
- Finish with a short report: per task, what you checked, what you changed (pin ids), what you left and why, and anything the owner should decide.`,
    ...(pages.length ? pages : ['(The OKF docs are not on this machine; read_okf will fail. Follow the rules above.)']),
  ].join('\n\n');
}

export async function kickoff(job: JobSetting, ctx: JobContext, now = new Date()): Promise<string> {
  const learnings = await JobRun.recentLearnings(LEARNINGS_IN_PROMPT);
  const tasks = job.tasks.map((id) => `- ${id} (${TASKS[id].label}): ${TASKS[id].summary} See "${id}" under Tasks in daily-jobs.md.`);
  return [
    `Run the "${job.label}" job (${job.id}) now: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: job.timeZone, dateStyle: 'full', timeStyle: 'short' })} in ${job.timeZone}).`,
    `Tasks, in this order:\n${tasks.join('\n')}`,
    `Limits for this run: at most ${ctx.maxNewPins} new pins and ${ctx.maxUpdates} pin updates.`,
    ctx.since ? `This job last completed a run at ${ctx.since.toISOString()}; "since the last update" means since then.` : 'This is the first run of this job; "since the last update" means the last 24 hours.',
    learnings.length
      ? `What earlier runs learned, newest first (act on these):\n${learnings.map((l) => `- [${l.at.slice(0, 10)} ${l.jobId}] ${l.topic}: ${l.text}`).join('\n')}`
      : 'No earlier run has recorded a learning yet.',
  ].join('\n\n');
}
