import { TZDate } from '@date-fns/tz';

// The daily pin jobs: when each runs, what it works on, and who reasons for it
// (src/server/jobs, docs/okf/scraping/daily-jobs.md). An admin setting
// (AppSetting "dailyJobs"); this is its shape, its default and its parser.
//
// A job is a list of tasks run as one LLM-orchestrated session at each of its
// times. The tasks' full guidance lives in the OKF page, which the run reads
// into its prompt, so a lesson learned there changes the next run without a
// deploy; the one-liners here are for the admin page.

// Grouped by what a task is for, in the order a run works them: fix what is
// there before adding to it, then look for what is missing, then the standing
// beats, then the scores - last, so they cover the pins the run just added.
// The admin page lists the tasks under these headings, and a run's
// instructions name them in the same order.
export const TASK_GROUPS = [
  { id: 'upkeep', label: 'Keep pins right', summary: 'Re-check the pins that exist: marked ones, soft dates, broken media, new sources.' },
  { id: 'discover', label: 'Find new events', summary: 'Look for what the timeline is missing, from what people search, read and say.' },
  { id: 'beats', label: 'Beats', summary: 'Subjects covered every run, whatever else is in the news.' },
  { id: 'scores', label: 'Scores', summary: 'Keep the numbers the pages graph up to date.' },
] as const;

export type TaskGroupId = (typeof TASK_GROUPS)[number]['id'];

type TaskDef = { group: TaskGroupId; label: string; summary: string };

export const TASKS = {
  revisits: {
    group: 'upkeep',
    label: 'Pins marked for revisiting',
    summary: 'Work the revisit queue: re-research each marked pin, update it, and resolve the mark.',
  },
  weekReview: {
    group: 'upkeep',
    label: "This week's pins",
    summary: 'Check the pins happening this week are up to date and well vetted: dates, places, sources.',
  },
  freshSources: {
    group: 'upkeep',
    label: 'New sources and media',
    summary: 'Add sources published since a pin was last updated, replace broken media and add newer media.',
  },
  pinHealth: {
    group: 'upkeep',
    label: 'Pin health',
    summary: 'Find broken videos, pictures and sources; fix them, and add references and thread links that are missing.',
  },
  trends: {
    group: 'discover',
    label: 'Google Trends',
    summary: 'Shortlist what the world is searching for and pin the dated events behind it.',
  },
  breakingNews: {
    group: 'discover',
    label: 'Major news',
    summary: 'Pin major news and newly announced events since the last run.',
  },
  thinCategories: {
    group: 'discover',
    label: 'Thin categories',
    summary: 'Find categories with little or no future and add pins for their major upcoming events.',
  },
  trendingCategories: {
    group: 'discover',
    label: 'Trending categories',
    summary: 'Add major-event pins to the categories readers are opening most right now.',
  },
  commentTopics: {
    group: 'discover',
    label: 'Comment topics',
    summary: 'Scan recent comments for subjects people keep raising that deserve a pin of their own.',
  },
  localEvents: {
    group: 'discover',
    label: 'Local events',
    summary: 'Pin newly announced major events near where active users are.',
  },
  fortune100: {
    group: 'beats',
    label: 'Fortune 100 news',
    summary: "Take the next few Fortune 100 companies, least recently covered first, and pin their dated news: results, deals, launches, rulings, plants.",
  },
  layoffs: {
    group: 'beats',
    label: 'Layoffs',
    summary: "Pin newly announced layoffs and closures, each checked against the company's memo, SEC filing or state WARN notice.",
  },
  sentiment: {
    group: 'scores',
    label: 'Refresh sentiment',
    summary: 'Score the company pins whose title or summary changed since they were scored, or never were, and comments with no tone yet, for the company sentiment graphs.',
  },
} as const satisfies Record<string, TaskDef>;

export type TaskId = keyof typeof TASKS;
export const TASK_IDS = Object.keys(TASKS) as TaskId[];

// A group's tasks, in run order.
export function groupTasks(group: TaskGroupId, among: readonly TaskId[] = TASK_IDS): TaskId[] {
  return TASK_IDS.filter((id) => TASKS[id].group === group && among.includes(id));
}

export const DRIVERS = ['auto', 'api', 'session'] as const;
export type DriverChoice = (typeof DRIVERS)[number];

export type JobSetting = {
  id: string;
  label: string;
  enabled: boolean;
  // Local wall-clock times, "HH:MM", in timeZone.
  times: string[];
  timeZone: string;
  tasks: TaskId[];
  // auto: the app's API key when it has credit, else a Claude Code session.
  driver: DriverChoice;
  maxNewPins: number;
  maxUpdates: number;
};

export type DailyJobsSetting = { jobs: JobSetting[] };

export const MAX_NEW_PINS = 100;
export const MAX_UPDATES = 250;
export const MAX_TIMES = 6;

// The two jobs the owner asked for, with up to 100 new pins and 250 updates
// a run (owner, 2026-09-22). Both ship off (owner, 2026-09-23: "turn off
// nightly jobs by default"); an admin turns them on at /admin/jobs. There is
// no dry run - every run writes ("no dry run needed", "remove dry run option").
export const DEFAULT_DAILY_JOBS: DailyJobsSetting = {
  jobs: [
    {
      id: 'midnight',
      label: 'Midnight maintenance and new pins',
      enabled: false,
      times: ['00:00'],
      timeZone: 'America/Los_Angeles',
      // No sentiment: the news job scores new pins twice a day (owner, 2026-09-23).
      tasks: ['revisits', 'pinHealth', 'trends', 'thinCategories', 'trendingCategories', 'commentTopics', 'localEvents', 'fortune100', 'layoffs'],
      driver: 'auto',
      maxNewPins: MAX_NEW_PINS,
      maxUpdates: MAX_UPDATES,
    },
    {
      id: 'news',
      label: 'Morning and evening news check',
      enabled: false,
      times: ['06:00', '18:00'],
      timeZone: 'America/Los_Angeles',
      tasks: ['weekReview', 'freshSources', 'breakingNews', 'sentiment'],
      driver: 'auto',
      maxNewPins: MAX_NEW_PINS,
      maxUpdates: MAX_UPDATES,
    },
  ],
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const JOB_ID = /^[a-z][a-z0-9-]{0,39}$/;

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function parseJob(value: unknown, index: number): { job: JobSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { problem: `jobs[${index}] must be an object` };
  const raw = value as Record<string, unknown>;
  const at = `jobs[${index}]`;
  if (typeof raw.id !== 'string' || !JOB_ID.test(raw.id)) return { problem: `${at}.id must be lower-case letters, digits and dashes` };
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 80) : '';
  if (!label) return { problem: `${at}.label is required` };
  if (typeof raw.enabled !== 'boolean') return { problem: `${at}.enabled must be true or false` };
  if (!Array.isArray(raw.times) || !raw.times.length || raw.times.length > MAX_TIMES || !raw.times.every((t) => typeof t === 'string' && TIME.test(t))) {
    return { problem: `${at}.times must be 1 to ${MAX_TIMES} times as HH:MM` };
  }
  if (typeof raw.timeZone !== 'string' || !isTimeZone(raw.timeZone)) return { problem: `${at}.timeZone must be an IANA time zone` };
  if (!Array.isArray(raw.tasks) || !raw.tasks.length || !raw.tasks.every((t) => TASK_IDS.includes(t as TaskId))) {
    return { problem: `${at}.tasks must be one or more of ${TASK_IDS.join(', ')}` };
  }
  if (!DRIVERS.includes(raw.driver as DriverChoice)) return { problem: `${at}.driver must be one of ${DRIVERS.join(', ')}` };
  const count = (key: string, max: number) => {
    const n = raw[key];
    return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max ? (n as number) : null;
  };
  const maxNewPins = count('maxNewPins', MAX_NEW_PINS);
  if (maxNewPins === null) return { problem: `${at}.maxNewPins must be a whole number from 0 to ${MAX_NEW_PINS}` };
  const maxUpdates = count('maxUpdates', MAX_UPDATES);
  if (maxUpdates === null) return { problem: `${at}.maxUpdates must be a whole number from 0 to ${MAX_UPDATES}` };
  return {
    job: {
      id: raw.id,
      label,
      enabled: raw.enabled,
      times: [...new Set(raw.times as string[])].sort(),
      timeZone: raw.timeZone,
      tasks: TASK_IDS.filter((t) => (raw.tasks as string[]).includes(t)),
      driver: raw.driver as DriverChoice,
      maxNewPins,
      maxUpdates,
    },
  };
}

// A stored or submitted value as a setting, or the problem with it.
export function parseDailyJobs(value: unknown): { setting: DailyJobsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { jobs?: unknown }).jobs)) {
    return { problem: 'Expected { jobs: [...] }' };
  }
  const jobs: JobSetting[] = [];
  for (const [index, raw] of (value as { jobs: unknown[] }).jobs.entries()) {
    const parsed = parseJob(raw, index);
    if ('problem' in parsed) return parsed;
    if (jobs.some((j) => j.id === parsed.job.id)) return { problem: `job id ${parsed.job.id} is used twice` };
    jobs.push(parsed.job);
  }
  return { setting: { jobs } };
}

// How long after its time a missed slot still runs: a server that was down at
// 06:00 and back at 06:40 runs the morning check, one back at 17:00 does not
// run it late into the evening's.
export const CATCH_UP_MS = 2 * 60 * 60 * 1000;

export type Slot = { key: string; at: Date };

// The job's slots in the two local days around now, oldest first.
function slotsAround(job: Pick<JobSetting, 'id' | 'times' | 'timeZone'>, now: Date): Slot[] {
  const local = new TZDate(now.getTime(), job.timeZone);
  const slots: Slot[] = [];
  for (const dayOffset of [-1, 0]) {
    const day = new TZDate(local.getFullYear(), local.getMonth(), local.getDate() + dayOffset, 12, 0, job.timeZone);
    for (const time of job.times) {
      const [hh, mm] = time.split(':').map(Number);
      const at = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, job.timeZone);
      const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      slots.push({ key: `${job.id}@${ymd}T${time} ${job.timeZone}`, at: new Date(at.getTime()) });
    }
  }
  return slots.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// The slot that is due now: the latest one at or before now, if it is no
// more than CATCH_UP_MS old. Claiming it (src/server/model/jobRun.ts) is what
// stops it running twice.
export function dueSlot(job: Pick<JobSetting, 'id' | 'times' | 'timeZone'>, now: Date): Slot | null {
  const past = slotsAround(job, now).filter((s) => s.at.getTime() <= now.getTime());
  const latest = past[past.length - 1];
  return latest && now.getTime() - latest.at.getTime() <= CATCH_UP_MS ? latest : null;
}

// When the job next runs, for the admin page.
export function nextRun(job: Pick<JobSetting, 'id' | 'times' | 'timeZone'>, now: Date): Date {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = [...slotsAround(job, now), ...slotsAround(job, tomorrow)].filter((s) => s.at.getTime() > now.getTime());
  return upcoming.sort((a, b) => a.at.getTime() - b.at.getTime())[0].at;
}
