import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { siteDescription, siteName } from '@/lib/appConfig';
import { plainText } from '@/lib/format';
import { absoluteUrl, pinPath } from '@/lib/seo';
import Pins from '@/server/model/pins';
import { TAGS } from '@/server/services/cache';
import { timelineMinConfidence } from '@/server/services/timeline';

// /llms.txt (llmstxt.org): what Chronopin is and how to read a pin page, for
// answer engines and the models behind them, then the dates coming up next -
// each a link to its pin page, which carries the sources and confidence. The
// sitemap lists every pin; this is the short version a model reads first.
const UPCOMING = 300;

async function llmsText(): Promise<string> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  const pins = await Pins.upcoming(new Date(), UPCOMING, await timelineMinConfidence());
  const upcoming = pins.map((pin) => {
    const description = pin.description ? `: ${plainText(pin.description, 200)}` : '';
    const category = pin.category ? ` · ${pin.category}` : '';
    return `- [${pin.title.replace(/[[\]]/g, '')}](${absoluteUrl(pinPath(pin))}) - ${when(pin)}${category}${description}`;
  });
  return [
    `# ${siteName}`,
    '',
    `> ${siteDescription} Every pin is one dated thing - a release, launch, premiere, event, deadline or law taking effect - with the sources that back its date.`,
    '',
    'How to read a pin page:',
    '',
    '- The date: its start (and end, for a span), with a date confidence word taken from how firmly the source states it: confirmed, scheduled, estimated, delayed or unverified. A delayed pin also says the date it was first due and why it moved.',
    '- Times: a pin with a clock time is an exact instant (shown in UTC to a crawler, and in the <time datetime> attribute); an all-day pin is a calendar date.',
    "- Overall confidence: a percentage for how well the pin's numbered references back its dates; each reference says which dates it supports.",
    '- The summary cites those references by number, and the title links to the source.',
    '- Thread: earlier and later pins in the same story or series, in order.',
    '- Each page carries schema.org JSON-LD: an Article whose temporalCoverage is the pin\'s dates, and an Event for one people can attend.',
    '',
    '## Pages',
    '',
    `- [Timeline](${absoluteUrl('/')}): every pin by date, centred on today`,
    `- [Map](${absoluteUrl('/map')}): pins with a place, on a world map`,
    `- [Sitemap](${absoluteUrl('/sitemap.xml')}): every pin page, with its other languages`,
    '',
    '## Upcoming dates',
    '',
    ...upcoming,
    '',
  ].join('\n');
}

// "2026-11-19" for an all-day pin, "2026-11-18 23:40 UTC" for a timed one.
function when(pin: { utcStartDateTime: Date; allDay: boolean }): string {
  const iso = new Date(pin.utcStartDateTime).toISOString();
  return pin.allDay ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export async function GET() {
  // Rendered per request (then cached), so building the app needs no database.
  await connection();
  return new Response(await llmsText(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
