// Reads who performs at each upcoming event pin and how to get in - ticket
// price, whether it is on sale, the ticket link - off the pin's own pages, and
// stores it (PinEventInfo, 0082) for the pin page and its Event markup.
//
//   npm run events:refresh                         dry run: print what each pin's pages say
//   npm run events:refresh -- --apply              store it in the local database
//   npm run events:refresh -- --ids 2320,3334 --apply
//   npm run events:refresh -- --hours 24 --apply   skip pins read in the last day
//   npm run events:refresh -- --export tasks.json  no credit: the pages and the rules, for a session
//   npm run events:refresh -- --import answers.json --tasks tasks.json --apply
//                                                  store a session's answers to that export
//   CHRONOPIN_TOKEN=... npm run events:refresh -- --apply --push https://www.chronopin.com
//                                                  store through that site's API instead
//
// Which pins: those the site marks as events (isAttendableEvent in
// src/lib/seo.ts) that have not started. Which pages: the pin's source, then
// its two most confident references.
//
// How: the page's own schema.org Event markup first - it is the event's own
// claim, so its price and sale state win. Claude then reads the pages' text
// for what the markup leaves out, and may only use what a page states about
// this event on this date. Without a key (or credit), --export writes the
// pages and the rules for a Claude Code session to answer by hand, and
// --import stores those answers as source 'session'.
//
// READ THE DRY RUN: a tour page lists many shows, and the one read must be
// this pin's night and venue. A row someone set by hand is never overwritten.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import {
  combineReading,
  describeEvent,
  describeReading,
  EVENT_INFO_PROMPT,
  EVENT_INFO_SCHEMA,
  eventPins,
  pagesForReading,
  readEventPages,
  readWithClaude,
  type EventReading,
  type PageRead,
} from '@/server/eventInfo';
import { getClient } from '@/server/extract';
import { markEventChecked, saveEventInfo } from '@/server/model/pinEventInfo';
import { hasEventInfo } from '@/lib/eventInfo';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    hours: { type: 'string', default: '0' },
    limit: { type: 'string', default: '500' },
    pause: { type: 'string', default: '1500' },
    export: { type: 'string' },
    import: { type: 'string' },
    tasks: { type: 'string' },
    push: { type: 'string' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Stores a reading here, or through --push's API.
async function store(pinId: number, reading: EventReading): Promise<string> {
  if (flags.push) {
    const token = process.env.CHRONOPIN_TOKEN;
    if (!token) throw new Error('--push needs CHRONOPIN_TOKEN (an admin token for that site)');
    const response = await fetch(`${flags.push.replace(/\/$/, '')}/api/pins/${pinId}/event-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...reading.fields, source: reading.source, sourceUrl: reading.sourceUrl }),
    });
    return response.ok ? 'stored' : `NOT STORED (${response.status} ${(await response.text()).slice(0, 200)})`;
  }
  return (await saveEventInfo(pinId, reading.fields, { source: reading.source, sourceUrl: reading.sourceUrl })) ? 'stored' : 'NOT STORED (set by hand)';
}

// --import: a session's answers to an --export, [{ pinId, performers, ... }],
// held to the same rules as Claude's: read against the exported pages (--tasks)
// so the markup's claims win and a ticket link must be one the pages carry.
async function importAnswers(file: string) {
  if (!flags.tasks) throw new Error('--import needs --tasks <the --export file it answers>');
  const answers = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
  const { tasks } = JSON.parse(readFileSync(flags.tasks, 'utf8')) as { tasks: { pinId: number; pages: PageRead[] }[] };
  const tally = { stored: 0, empty: 0, failed: 0 };
  for (const answer of answers) {
    const pinId = Number(answer.pinId);
    const task = tasks.find((t) => t.pinId === pinId);
    if (!task) {
      console.log(`#${pinId}: not in ${flags.tasks}`);
      tally.failed++;
      continue;
    }
    const pages: PageRead[] = task.pages.map((p) => ({ ...p, markup: p.markup ?? null }));
    const reading = combineReading(answer, pages, 'session');
    if (typeof reading === 'string') {
      console.log(`#${pinId}: rejected: ${reading}`);
      tally.failed++;
      continue;
    }
    const links = new Set(pages.flatMap((p) => [...p.ticketLinks.map((l) => l.href), p.markup?.ticketUrl]));
    if (answer.ticketUrl && !links.has(String(answer.ticketUrl))) console.log(`#${pinId}: ticket link ${String(answer.ticketUrl)} is not on its pages; dropped`);
    if (!hasEventInfo(reading.fields)) {
      tally.empty++;
      continue;
    }
    console.log(`#${pinId}: ${reading.source}: ${describeReading(reading.fields)}`);
    if (flags.apply) {
      const result = await store(pinId, reading);
      console.log(`    ${result}`);
      if (result === 'stored') tally.stored++;
      else tally.failed++;
    }
  }
  console.log(`Done: ${tally.stored} stored, ${tally.empty} with nothing stated, ${tally.failed} not stored.`);
}

async function run() {
  if (flags.import) {
    await importAnswers(flags.import);
    return;
  }
  const ids = flags.ids?.split(',').map((id) => Number(id.trim())).filter(Boolean);
  const pins = await eventPins({ ids, hours: Number(flags.hours), limit: Number(flags.limit) });
  console.log(`${pins.length} upcoming event pin(s) to read${flags.apply ? '' : ' (dry run)'}`);
  const anthropic = flags.export ? null : getClient();
  if (!anthropic && !flags.export) console.log('No Anthropic key: storing what page markup says; use --export for the rest.');

  const { launchBrowser } = await import('@/server/scrape');
  const browser = await launchBrowser();
  const tasks: unknown[] = [];
  const tally = { stored: 0, empty: 0, failed: 0 };
  try {
    for (const pin of pins) {
      console.log(`#${pin.id} ${pin.title} (${pin.utcStartDateTime.slice(0, 10)})`);
      const pages = await readEventPages(browser, pin);
      if (flags.export) {
        tasks.push({ pinId: pin.id, event: describeEvent(pin), pages: pagesForReading(pages) });
        continue;
      }
      const answer = anthropic && pages.some((p) => p.text.length > 200) ? await readWithClaude(anthropic, pin, pages) : null;
      const reading = combineReading(answer, pages);
      if (typeof reading === 'string') {
        console.log(`    rejected: ${reading}`);
        tally.failed++;
        continue;
      }
      if (!hasEventInfo(reading.fields)) {
        console.log('    nothing stated');
        // Checked, so a refresh with --hours passes it by until it is due.
        if (flags.apply && !flags.push) await markEventChecked(pin.id, reading);
        tally.empty++;
        continue;
      }
      console.log(`    ${reading.source}: ${describeReading(reading.fields)}`);
      if (flags.apply) {
        const result = await store(pin.id, reading);
        console.log(`    ${result}`);
        if (result === 'stored') tally.stored++;
        else tally.failed++;
      }
      await sleep(Number(flags.pause));
    }
  } finally {
    await browser.close();
  }

  if (flags.export) {
    writeFileSync(flags.export, JSON.stringify({ rules: EVENT_INFO_PROMPT, answerShape: EVENT_INFO_SCHEMA, tasks }, null, 2));
    console.log(`Wrote ${tasks.length} task(s) to ${flags.export}. Answer each as [{ pinId, ...answerShape }] and run --import <answers> --apply.`);
    return;
  }
  console.log(`Done: ${tally.stored} stored, ${tally.empty} with nothing stated, ${tally.failed} not stored.`);
  if (flags.apply && !flags.push) console.log('Persist it with npm run backup:data.');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
