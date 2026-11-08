// The service status of an AI model's vendor (ServiceStatus, 0250), read from
// StatusGator's public service page. Unofficial: StatusGator folds the vendor's own
// status page and user reports into one state per day.

export type ServiceState = 'up' | 'warning' | 'down' | 'maintenance';

export type ServiceStatusJson = {
  slug: string;
  name: string;
  status: ServiceState;
  headline: string | null;
  uptimePct: number | null;
  downMinutes: number;
  degradedMinutes: number;
  days: { d: string; s: ServiceState }[];
  sourceUrl: string;
  checkedAt: string;
};

// First match wins. The title names the model; the slug is the StatusGator service.
export const SERVICES: { re: RegExp; slug: string; name: string }[] = [
  { re: /\bantigravity\b/i, slug: 'google-antigravity', name: 'Google Antigravity' },
  { re: /\b(claude|anthropic)\b/i, slug: 'anthropic', name: 'Anthropic (Claude)' },
  { re: /\b(gpt|chatgpt|openai|sora|codex)\b|\bo[1-9](-\w+)?\b/i, slug: 'openai', name: 'OpenAI' },
  { re: /\b(gemini|veo)\b/i, slug: 'gemini', name: 'Google Gemini' },
  { re: /\bgrok\b/i, slug: 'grok', name: 'Grok' },
  { re: /\bdeepseek\b/i, slug: 'deepseek', name: 'DeepSeek' },
  { re: /\bmistral\b/i, slug: 'mistral-ai', name: 'Mistral AI' },
  { re: /\bperplexity\b/i, slug: 'perplexity', name: 'Perplexity' },
];

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
    uptimePct, downMinutes: down, degradedMinutes: degraded, days: days.map(({ d, s }) => ({ d, s })), sourceUrl: statusGatorUrl(slug),
  };
}
