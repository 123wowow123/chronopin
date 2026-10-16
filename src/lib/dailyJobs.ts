import { TZDate } from '@date-fns/tz';

// The daily pin jobs: when each runs, what it works on, and who reasons for it
// (src/server/jobs, docs/okf/scraping/daily-jobs.md). An admin setting
// (AppSetting "dailyJobs"); this is its shape, its default and its parser.
// A job runs every day at its times, or - with a dayOfWeek or a dayOfMonth -
// only on that day of each week or month.
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
  lowConfidence: {
    group: 'upkeep',
    label: 'Low-confidence pins',
    summary: "Re-scrape the pins scored below the timeline's confidence bar and update them with firmer dates and stronger references.",
  },
  thinPins: {
    group: 'upkeep',
    label: 'Thin pins',
    summary: "Fill out the thinnest pins, which search engines are told not to index: a fuller, cited summary from more than one source, and independent references beyond the pin's own source.",
  },
  eventInfo: {
    group: 'upkeep',
    label: 'Performers and tickets',
    summary: "Read the upcoming event pins' own pages for who performs, ticket prices, whether tickets are on sale or sold out, and the ticket link.",
  },
  products: {
    group: 'upkeep',
    label: 'Products page',
    summary: "Refresh the /products landing page: a researched why-it-is-good line and published rating for each product that is new to a shelf or whose line has gone stale, checked against reviews and the maker's page.",
  },
  pinAds: {
    group: 'upkeep',
    label: 'Pin ads',
    summary: "Check every pin's Amazon ad still works and is well reviewed, replace the broken ones, and add trusted-brand products that suit the pins, matching the pin's own brand when there is one.",
  },
  holidayAds: {
    group: 'upkeep',
    label: 'Holiday ads',
    summary: "Stock the traditional goods of the cultural holidays coming up, and of any holiday a pin falls on (mooncakes and lanterns for the Mid-Autumn Festival) as inexpensive, middle and expensive Amazon ads, keep them working, and drop any that are not truly traditional.",
  },
  adTranslations: {
    group: 'upkeep',
    label: 'Ad translations',
    summary: 'Translate opted-in sponsored ads, including admin ads, into every missing site language and save session-written translations with current source hashes.',
  },
  restaurantRegions: {
    group: 'upkeep',
    label: 'Restaurant region pages',
    summary: "Refresh the restaurant landing page of every region where a restaurant pin was created since the last run: re-check its openings and top restaurants, and fill in what the new pin implies.",
  },
  personTrades: {
    group: 'upkeep',
    label: 'Stock trades of people',
    summary: "Read the House and Senate periodic transaction reports for new stock trades by members of Congress, save them to the people's pages and tell the people watching each person.",
  },
  threadPredicted: {
    group: 'upkeep',
    label: 'Thread predicted pins',
    summary: 'Check predicted pins for an earlier pin or thread in their story, series or franchise, and attach them with parentId if available.',
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
  predictionMarkets: {
    group: 'discover',
    label: 'Prediction markets',
    summary: 'Scrape prediction markets for interesting events and monthly Brent & WTI commodity prices; create predicted pins, make them into threads, and after price realization add reasoning of final value and why prediction was missed or on point.',
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
    summary: "Pin newly announced major events near where readers are: members' saved places and the cities their pin views come from.",
  },
  fortune100: {
    group: 'beats',
    label: 'Fortune 100 news',
    summary: "Take the next few Fortune 100 companies, least recently covered first, and pin their dated news: results, deals, launches, rulings, plants.",
  },
  layoffs: {
    group: 'beats',
    label: 'Layoffs',
    summary: "Search for newly announced layoffs and closures, create missing pins and update existing pins with verified developments from company memos, SEC filings or state WARN notices; add or refresh sourced graphs where available.",
  },
  hiringJobCreation: {
    group: 'beats',
    label: 'Hiring, new roles and job creation',
    summary: 'Research hiring, emerging job types and job-creating projects; create missing pins and update existing pins with verified job counts, spending, dates and locations; add or refresh sourced graphs of jobs and spending where available.',
  },
  modelScores: {
    group: 'scores',
    label: 'Arena scores for AI models',
    summary: "Check the AI model pins whose model has a price but no LMArena score yet, and tag 'Frontier Model' on the ones the arena has since scored that lead their year's cost/quality line.",
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
  // The day of the month it runs on (1-28, so every month has it), or null
  // to run every day.
  dayOfMonth: number | null;
  // The day of the week it runs on (0 Sunday to 6 Saturday), or null. A job
  // has a day of the week or a day of the month, not both.
  dayOfWeek: number | null;
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
export const MAX_DAY_OF_MONTH = 28;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// The jobs the owner asked for, with up to 100 new pins and 250 updates a run
// (owner, 2026-09-22), and the monthly re-check of low-confidence pins
// (owner, 2026-09-24), which only updates. All ship off (owner, 2026-09-23:
// "turn off nightly jobs by default"); an admin turns them on at /admin/jobs.
// There is no dry run - every run writes ("no dry run needed", "remove dry
// run option").
export const DEFAULT_DAILY_JOBS: DailyJobsSetting = {
  jobs: [
    {
      id: 'midnight',
      label: 'Midnight maintenance and new pins',
      enabled: false,
      times: ['00:00'],
      timeZone: 'America/Los_Angeles',
      dayOfMonth: null,
      dayOfWeek: null,
      // No sentiment: the news job scores new pins twice a day (owner, 2026-09-23).
      // thinPins fills out a batch of the pins hidden from search as thin (owner, 2026-10-04).
      tasks: ['revisits', 'pinHealth', 'thinPins', 'adTranslations', 'restaurantRegions', 'trends', 'thinCategories', 'trendingCategories', 'commentTopics', 'localEvents', 'fortune100', 'layoffs'],
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
      dayOfMonth: null,
      dayOfWeek: null,
      // eventInfo twice a day, so a sell-out shows by the next run; prediction
      // markets scrapes for interesting events that prediction markets have,
      // adds monthly Brent and WTI commodity prices, creates predicted pins,
      // threads them, and updates realized pins with reasoning (owner, 2026-10-01, 2026-10-15).
      // modelScores checks twice a day for the arena scores that models lack at
      // launch (owner, 2026-10-12). threadPredicted checks predicted pins for
      // an available thread to join (owner, 2026-10-14). layoffs searches for
      // new rounds and updates existing pins twice a day (owner, 2026-10-15).
      // Hiring, new roles and job-creating investment follow the same twice-daily
      // discovery and maintenance cadence.
      tasks: ['weekReview', 'freshSources', 'eventInfo', 'pinAds', 'holidayAds', 'adTranslations', 'personTrades', 'threadPredicted', 'breakingNews', 'predictionMarkets', 'layoffs', 'hiringJobCreation', 'modelScores', 'sentiment'],
      driver: 'auto',
      maxNewPins: MAX_NEW_PINS,
      maxUpdates: MAX_UPDATES,
    },
    {
      id: 'monthly',
      label: 'Monthly low-confidence re-check',
      enabled: false,
      // Between midnight and the morning check, on the 1st.
      times: ['03:00'],
      timeZone: 'America/Los_Angeles',
      dayOfMonth: 1,
      dayOfWeek: null,
      tasks: ['lowConfidence'],
      driver: 'auto',
      maxNewPins: 0,
      maxUpdates: MAX_UPDATES,
    },
    {
      // Monday early, so the week opens with the page refreshed (owner,
      // 2026-10-08: "a weekly job that refreshes the product landing page").
      id: 'weekly',
      label: 'Weekly products page refresh',
      enabled: false,
      times: ['04:00'],
      timeZone: 'America/Los_Angeles',
      dayOfMonth: null,
      dayOfWeek: 1,
      tasks: ['products'],
      driver: 'auto',
      maxNewPins: 0,
      maxUpdates: 100,
    },

  ],
};

// A saved setting with any default job it lacks added (off, as it ships), so
// a job introduced after an admin first saved still shows on /admin/jobs.
export function withDefaultJobs(setting: DailyJobsSetting): DailyJobsSetting {
  // Fold the short-lived separate translation job into the existing daily
  // runs, including saved settings from before this task was introduced.
  // Add the owner-requested twice-daily layoff and hiring beats, and the
  // person stock-trades update (2026-10-16), to saved news jobs too.
  let changed = false;
  const jobs = setting.jobs.flatMap((job): JobSetting[] => {
    if (job.id === 'ad-translations') { changed = true; return []; }
    const required: TaskId[] = job.id === 'news' ? ['adTranslations', 'layoffs', 'hiringJobCreation', 'personTrades'] : job.id === 'midnight' ? ['adTranslations'] : [];
    if (required.some((task) => !job.tasks.includes(task))) {
      changed = true;
      return [{ ...job, tasks: TASK_IDS.filter((task) => required.includes(task) || job.tasks.includes(task)) }];
    }
    return [job];
  });
  const missing = DEFAULT_DAILY_JOBS.jobs.filter((d) => !jobs.some((j) => j.id === d.id));
  return changed || missing.length ? { jobs: [...jobs, ...missing] } : setting;
}

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
  // Missing on settings saved before jobs could be monthly: every day.
  const dayOfMonth = raw.dayOfMonth ?? null;
  if (dayOfMonth !== null && !(Number.isInteger(dayOfMonth) && (dayOfMonth as number) >= 1 && (dayOfMonth as number) <= MAX_DAY_OF_MONTH)) {
    return { problem: `${at}.dayOfMonth must be null or a whole number from 1 to ${MAX_DAY_OF_MONTH}` };
  }
  const dayOfWeek = raw.dayOfWeek ?? null;
  if (dayOfWeek !== null && !(Number.isInteger(dayOfWeek) && (dayOfWeek as number) >= 0 && (dayOfWeek as number) <= 6)) {
    return { problem: `${at}.dayOfWeek must be null or a whole number from 0 (Sunday) to 6 (Saturday)` };
  }
  if (dayOfWeek !== null && dayOfMonth !== null) return { problem: `${at} can have a dayOfWeek or a dayOfMonth, not both` };
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
      dayOfMonth: dayOfMonth as number | null,
      dayOfWeek: dayOfWeek as number | null,
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
// run it late into the evening's. A weekly or monthly job's slot waits a day
// instead - letting it go would skip a week or a month, and it may sit behind a long midnight run.
export const CATCH_UP_MS = 2 * 60 * 60 * 1000;
export const MONTHLY_CATCH_UP_MS = 24 * 60 * 60 * 1000;

type Schedule = Pick<JobSetting, 'id' | 'times' | 'timeZone' | 'dayOfMonth' | 'dayOfWeek'>;

export function catchUpMs(job: Pick<JobSetting, 'dayOfMonth' | 'dayOfWeek'>): number {
  return job.dayOfMonth || job.dayOfWeek != null ? MONTHLY_CATCH_UP_MS : CATCH_UP_MS;
}

export type Slot = { key: string; at: Date };

// The job's slots on the local days `from` to `to` days from now's, oldest
// first; a weekly or monthly job has them only on its day.
function slotsAround(job: Schedule, now: Date, from = -1, to = 0): Slot[] {
  const local = new TZDate(now.getTime(), job.timeZone);
  const slots: Slot[] = [];
  for (let dayOffset = from; dayOffset <= to; dayOffset++) {
    const day = new TZDate(local.getFullYear(), local.getMonth(), local.getDate() + dayOffset, 12, 0, job.timeZone);
    if (job.dayOfMonth && day.getDate() !== job.dayOfMonth) continue;
    if (job.dayOfWeek != null && day.getDay() !== job.dayOfWeek) continue;
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
// older than the job's catch-up window. Claiming it
// (src/server/model/jobRun.ts) is what stops it running twice.
export function dueSlot(job: Schedule, now: Date): Slot | null {
  const past = slotsAround(job, now).filter((s) => s.at.getTime() <= now.getTime());
  const latest = past[past.length - 1];
  return latest && now.getTime() - latest.at.getTime() <= catchUpMs(job) ? latest : null;
}

// When the job next runs, for the admin page. A month is at most 31 days, so
// a monthly job's next slot is within the next 32.
export function nextRun(job: Schedule, now: Date): Date {
  const upcoming = slotsAround(job, now, 0, job.dayOfMonth ? 32 : job.dayOfWeek != null ? 8 : 1).filter((s) => s.at.getTime() > now.getTime());
  return upcoming[0].at;
}
