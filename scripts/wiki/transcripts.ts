// Adds YouTube transcripts to the sources that have none. wiki:sync reads a
// video's captions once, and YouTube answers 429 when many are asked for at
// once, leaving the text with only the video's details. This asks slowly and
// backs off, so those videos' wikis can be written from what was said.
//
//   npm run wiki:transcripts                 every YouTube source without a transcript
//   npm run wiki:transcripts -- --limit 20   at most 20 of them
//   npm run wiki:transcripts -- --delay 5    seconds between videos (default 4)
//
// A source whose wiki was already written from the details alone goes back to
// pending so its wiki is written again. Then wiki:sync (or wiki:export, with
// no API credit) picks them up.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Source from '@/server/model/source';
import { fetchTranscript } from '@/server/scrape/transcript';

const { values: flags } = parseArgs({ options: { limit: { type: 'string' }, delay: { type: 'string' } } });
const DELAY_MS = Number(flags.delay ?? 4) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function transcriptOf(url: string) {
  for (let wait = 30_000; ; wait = Math.min(wait * 2, 600_000)) {
    try {
      return (await fetchTranscript(url)).text;
    } catch (err) {
      const message = (err as Error).message;
      if (!/failed with 429/.test(message)) throw err;
      console.log(`  rate limited, waiting ${wait / 1000}s`);
      if (wait >= 600_000) throw new Error('rate limited for good');
      await sleep(wait);
    }
  }
}

async function run() {
  const rows = await db.query<{ id: number; url: string; wikiVersion: number; text: string | null }>(
    `SELECT "id", "url", "wikiVersion", "text" FROM "Source"
     WHERE "kind" = 'youtube' AND COALESCE("text", '') NOT LIKE '%Transcript:%' ORDER BY "id" LIMIT $1`,
    [flags.limit ? Number(flags.limit) : 100_000],
  );
  console.log(`${rows.length} video(s) without a transcript`);
  let added = 0;
  let none = 0;
  for (const row of rows) {
    try {
      const text = await transcriptOf(row.url);
      if (text.trim()) {
        await Source.setText(row.id, { text: `${row.text ?? ''}\n\nTranscript:\n${text}` });
        if (row.wikiVersion > 0) await Source.markPending(row.id);
        added++;
        console.log(`source ${row.id}: ${text.length} characters`);
      } else none++;
    } catch (err) {
      const message = (err as Error).message;
      if (/rate limited for good/.test(message)) throw err;
      none++; // no captions, or the video is gone
      console.log(`source ${row.id}: ${message}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`${added} transcript(s) added, ${none} without captions`);
}

run()
  .catch((err) => {
    console.log('wiki:transcripts failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
