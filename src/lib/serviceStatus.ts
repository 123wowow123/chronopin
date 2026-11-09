// The service status of an AI model's vendor (ServiceStatus, 0250), read from
// StatusGator's public service page. Unofficial: StatusGator folds the vendor's own
// status page and user reports into one state per day.

export type ServiceState = 'up' | 'warning' | 'down' | 'maintenance';

export type ServiceIncident = { name: string; duration: string; startedAt: string; severity: 'warn' | 'down' | 'maintenance' };
export const MAX_INCIDENTS = 8;

// An incident names a model ("Elevated errors for Claude Sonnet 5.5") when the pin title
// carries the same version number and the word before it.
export function incidentNamesModel(incident: string, title: string): boolean {
  const t = title.toLowerCase();
  const found = [...incident.matchAll(/([A-Za-z][\w-]*)\s+(\d+(?:\.\d+)*)/g)];
  return found.length > 0 && found.every(([, word, version]) => t.includes(`${word} ${version}`.toLowerCase()));
}

export function parseIncidents(html: string): ServiceIncident[] {
  const out: ServiceIncident[] = [];
  const seen = new Set<string>();
  for (const [, row] of html.matchAll(/<tr>\s*<td>\s*<div class="line-clamp-2">\s*([^<]+?)\s*<\/div>\s*<\/td>\s*<td>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*<time datetime="([^"]+)"[\s\S]*?<\/td>\s*<td>([\s\S]*?)<\/td>/g).map((m) => [m, m[0]] as const)) {
    const m = /line-clamp-2">\s*([^<]+?)\s*<\/div>\s*<\/td>\s*<td>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*<time datetime="([^"]+)"[\s\S]*?<\/td>\s*<td>([\s\S]*?)<\/td>/.exec(row);
    if (!m) continue;
    const label = m[4].replace(/<[^>]*>/g, ' ').trim().toLowerCase();
    const severity = label.startsWith('down') ? 'down' : label.startsWith('maint') ? 'maintenance' : 'warn';
    const key = `${m[1]}|${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'"), duration: m[2], startedAt: m[3], severity });
  }
  return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, MAX_INCIDENTS);
}

export type ServiceStatusJson = {
  slug: string;
  name: string;
  status: ServiceState;
  headline: string | null;
  uptimePct: number | null;
  downMinutes: number;
  degradedMinutes: number;
  days: { d: string; s: ServiceState }[];
  incidents: ServiceIncident[];
  source: 'official' | 'statusgator';
  sourceUrl: string;
  checkedAt: string;
};

// First match wins. The title names the model; the slug is the StatusGator service.
export const SERVICES: { re: RegExp; slug: string; name: string }[] = [
  { re: /^\s*cursor\b/i, slug: 'cursor', name: 'Cursor' },
  { re: /\bantigravity\b/i, slug: 'google-antigravity', name: 'Google Antigravity' },
  { re: /\b(claude|anthropic)\b/i, slug: 'anthropic', name: 'Anthropic (Claude)' },
  { re: /\b(gpt|chatgpt|openai|sora|codex)\b|\bo[1-9](-\w+)?\b/i, slug: 'openai', name: 'OpenAI' },
  { re: /\b(gemini|veo)\b/i, slug: 'gemini', name: 'Google Gemini' },
  { re: /\bgrok\b/i, slug: 'grok', name: 'Grok' },
  { re: /\bdeepseek\b/i, slug: 'deepseek', name: 'DeepSeek' },
  { re: /\bmistral\b/i, slug: 'mistral-ai', name: 'Mistral AI' },
  { re: /\bperplexity\b/i, slug: 'perplexity', name: 'Perplexity' },
];

// Vendors whose own status page serves the Statuspage-style JSON API
// (/api/v2/summary.json + /api/v2/incidents.json). Others fall back to StatusGator.
export const OFFICIAL_STATUS_HOSTS: Record<string, string> = {
  anthropic: 'status.claude.com',
  openai: 'status.openai.com',
  'mistral-ai': 'status.mistral.ai',
  perplexity: 'status.perplexity.com',
  cursor: 'status.cursor.com', // redirects to status.x.ai/api/compat/*
};

// Product pins of a tracked service (Cursor's and Antigravity's launches) show its live health on every pin;
// model pins show it only while they are the latest release of their thread (isLatestRelease).
export const PRODUCT_STATUS_TITLE = /^\s*(cursor|google antigravity|antigravity)\b/i;

export const serviceForTitle = (title: string) => SERVICES.find((service) => service.re.test(title)) ?? null;
export const statusGatorUrl = (slug: string) => `https://statusgator.com/services/${slug}`;

const UNITS: Record<string, number> = { Day: 1440, Days: 1440, Hour: 60, Hours: 60, Minute: 1, Minutes: 1 };

// "Down for 9 Hours and 36 Minutes, Warning for 14 Hours and 23 Minutes" -> minutes per state.
export function dayMinutes(label: string): { state: ServiceState; minutes: Record<ServiceState, number> } {
  const minutes: Record<ServiceState, number> = { up: 0, warning: 0, down: 0, maintenance: 0 };
  for (const part of label.split(',')) {
    const state = /^\s*(down|warning|maintenance)/i.exec(part)?.[1]?.toLowerCase() as ServiceState | undefined;
    if (!state) continue;
    for (const [, n, unit] of part.matchAll(/(\d+)\s+(Days?|Hours?|Minutes?)/g)) minutes[state] += Number(n) * UNITS[unit];
  }
  const state: ServiceState = minutes.down ? 'down' : minutes.warning ? 'warning' : minutes.maintenance ? 'maintenance' : 'up';
  return { state, minutes };
}

export const WINDOW_DAYS = 30;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Reads the page's current-status sentence and its 30-day history. Null when the
// page no longer has the history (a changed layout must not store a made-up 100%).
export function parseStatusGator(html: string, slug: string, name: string): Omit<ServiceStatusJson, 'checkedAt'> | null {
  const start = html.indexOf('Service status history over the last 30 days');
  if (start < 0) return null;
  const block = html.slice(start, start + 200000);
  const days: (ServiceStatusJson['days'][number] & { m: Record<ServiceState, number> })[] = [];
  let down = 0;
  let degraded = 0;
  const seen = new Set<string>();
  for (const [, month, day, year, label] of block.matchAll(/aria-label="([A-Z][a-z]+) (\d{1,2}), (20\d\d): ([^"]+)"/g)) {
    const m = MONTHS.indexOf(month);
    const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (m < 0 || seen.has(key)) break; // the page repeats the strip for other views; keep the first
    seen.add(key);
    days.push({ d: key, s: dayMinutes(label).state, m: dayMinutes(label).minutes });
  }
  // The strip is 60 days on the page; the figure is the latest 30.
  days.sort((a, b) => (a.d < b.d ? -1 : 1));
  days.splice(0, Math.max(0, days.length - WINDOW_DAYS));
  if (days.length < 7) return null;
  for (const day of days) { down += day.m.down; degraded += day.m.warning; }
  const sentence = /StatusGator reports that (.+?) is currently ([^.<]+)\./.exec(html);
  const now = sentence?.[2] ?? 'operational';
  const status: ServiceState = /partial|degrad|warning|issue/i.test(now) ? 'warning' : /outage|down/i.test(now) ? 'down' : /maintenance/i.test(now) ? 'maintenance' : 'up';
  const detail = /currently [^.<]+\.\s+There have been[^.]*\.\s*([^<]*)/.exec(html)?.[1]?.trim() || null;
  const uptimePct = Math.round((1 - Math.min(down, days.length * 1440) / (days.length * 1440)) * 10000) / 100;
  return {
    slug, name, status,
    headline: status === 'up' ? null : (sentence ? `${name} is currently ${now}${detail ? `: ${detail}` : ''}` : null),
    uptimePct, downMinutes: down, degradedMinutes: degraded, days: days.map(({ d, s }) => ({ d, s })), incidents: parseIncidents(html), source: 'statusgator', sourceUrl: statusGatorUrl(slug),
  };
}

type StatuspageIncident = { name: string; status?: string; impact?: string; created_at: string; started_at?: string; resolved_at?: string | null };
type StatuspageSummary = { status?: { indicator?: string; description?: string }; incidents?: StatuspageIncident[] };

const severityOf = (impact: string | undefined, name: string): ServiceIncident['severity'] =>
  /maintenance/i.test(impact ?? '') || /^scheduled|maintenance/i.test(name) ? 'maintenance' : impact === 'major' || impact === 'critical' ? 'down' : 'warn';

const fmtDuration = (minutes: number) => {
  const m = Math.max(1, Math.round(minutes));
  return m >= 1440 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

const DAY = 86_400_000;

// Builds the same shape as the StatusGator parse from the vendor's own Statuspage JSON.
// Uptime is incident-based: the share of the window not covered by a major or critical
// incident (the API serves no uptime figure); minor incidents count as degraded.
export function parseStatuspage(
  summary: StatuspageSummary,
  recent: { incidents?: StatuspageIncident[] },
  slug: string,
  name: string,
  host: string,
  now = Date.now(),
): Omit<ServiceStatusJson, 'checkedAt'> | null {
  const list = recent.incidents;
  if (!summary.status || !Array.isArray(list)) return null;
  const todayStart = Math.floor(now / DAY) * DAY;
  const windowStart = todayStart - (WINDOW_DAYS - 1) * DAY;
  const intervals: Record<'down' | 'warning' | 'maintenance', [number, number][]> = { down: [], warning: [], maintenance: [] };
  const incidents: ServiceIncident[] = [];
  for (const incident of list) {
    const start = Date.parse(incident.started_at ?? incident.created_at);
    if (!Number.isFinite(start)) continue;
    const resolved = incident.resolved_at ? Date.parse(incident.resolved_at) : null;
    const end = resolved && Number.isFinite(resolved) ? resolved : now;
    const severity = severityOf(incident.impact, incident.name);
    incidents.push({ name: incident.name, duration: fmtDuration((end - start) / 60_000), startedAt: new Date(start).toISOString(), severity });
    if (end < windowStart || incident.impact === 'none') continue;
    intervals[severity === 'down' ? 'down' : severity === 'maintenance' ? 'maintenance' : 'warning'].push([Math.max(start, windowStart), Math.min(end, now)]);
  }
  const merged = (spans: [number, number][], from: number, to: number) => {
    let total = 0;
    let cursor = from;
    for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
      const lo = Math.max(a, cursor, from);
      const hi = Math.min(b, to);
      if (hi > lo) { total += hi - lo; cursor = hi; }
    }
    return total / 60_000;
  };
  const days: ServiceStatusJson['days'] = [];
  let down = 0;
  let degraded = 0;
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const from = windowStart + i * DAY;
    const to = from + DAY;
    const dm = merged(intervals.down, from, to);
    const wm = merged(intervals.warning, from, to);
    const mm = merged(intervals.maintenance, from, to);
    down += dm;
    degraded += wm;
    days.push({ d: new Date(from).toISOString().slice(0, 10), s: dm ? 'down' : wm ? 'warning' : mm ? 'maintenance' : 'up' });
  }
  const indicator = summary.status.indicator ?? 'none';
  const status: ServiceState = indicator === 'none' ? 'up' : indicator === 'minor' ? 'warning' : indicator === 'maintenance' ? 'maintenance' : 'down';
  const open = (summary.incidents ?? []).map((incident) => incident.name);
  const dayMinutesTotal = WINDOW_DAYS * 1440;
  return {
    slug, name, status,
    headline: status === 'up' ? null : [summary.status.description, ...open].filter(Boolean).join(': '),
    uptimePct: Math.round((1 - Math.min(down, dayMinutesTotal) / dayMinutesTotal) * 10000) / 100,
    downMinutes: Math.round(down), degradedMinutes: Math.round(degraded), days,
    incidents: incidents.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, MAX_INCIDENTS),
    source: 'official', sourceUrl: `https://${host}`,
  };
}
