// Gets the text back for the links that never got a wiki, so their pins'
// summaries can be built from what the source actually said.
//
// Those links fall into three groups, and this handles all three the same
// way - read the link again, properly, and only then decide:
//
//   * a wall that was not recognised as one. looksBlocked has been widened
//     (src/server/scrape/sourceText.ts), so text that was stored as the
//     article and is really a Cloudflare page is now seen for what it is.
//   * a page the live web no longer serves: the site folded, or was bought
//     and every old URL now redirects to the new front page.
//   * a link whose fetch failed outright.
//
// A live read comes first, because a page that answers now answers with the
// article as it stands. When that gives a wall or nothing, the Internet
// Archive's nearest capture to the pin's own date is tried
// (src/server/scrape/archive.ts). Keyless, so this runs with no API credit.
//
//   npm run wiki:recover-dead                      list what it would read
//   npm run wiki:recover-dead -- --apply           read them
//   npm run wiki:recover-dead -- --apply --limit 40 --offset 80
//   npm run wiki:recover-dead -- --apply --id 834  just those links
//   npm run wiki:recover-dead -- --apply --live-only    skip the archive
//   npm run wiki:recover-dead -- --apply --concurrency 6 --delay 1
//
// Only one run at a time: a second is refused while the first holds the lock.
//
// A link that reads is left pending, for `npm run wiki:export` (or wiki:sync,
// with credit) to write its wiki. One that is dead in the archive too is
// failed with a verdict saying so, so it stops being counted as pending work
// and its pin's summary is built from the links that do read.

import '../env';
import { parseArgs } from 'node:util';
import type pg from 'pg';
import * as db from '@/server/db';
import Source from '@/server/model/source';
import { fetchArchivedText } from '@/server/scrape/archive';
import { fetchSourceText, looksBlocked } from '@/server/scrape/sourceText';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string' },
    offset: { type: 'string' },
    id: { type: 'string', multiple: true },
    'live-only': { type: 'boolean', default: false },
    delay: { type: 'string' },
    concurrency: { type: 'string' },
  },
});

// How many links are in flight at once, and the pause each worker takes
// between its own links. archive.org serves a CDX lookup in about half a
// minute and rate-limits a caller that pushes, so neither goes much higher.
const CONCURRENCY = Math.max(1, Number(flags.concurrency ?? 4));
const DELAY_MS = Number(flags.delay ?? 2) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Every wall this script exists to clean up was stored as article text
// because nothing recognised its wording, and new wording keeps arriving
// (phys.org's "we're checking your connection" was found by this run). So
// length is the test that does not depend on knowing the wording: a wall is a
// sentence or two, an article is not. Below this a page is treated as not
// read, whatever it says, and the archive is tried instead.
// MIN_CAPTURE_CHARS in scrape/archive.ts is the same floor for a capture.
const MIN_ARTICLE_CHARS = 500;

// The wall pages this is here to clean up were stored as article text, so
// "has text" is not the test - "has text that reads like the article" is.
// A YouTube source is its title, channel and description, which can fairly be
// short, so only the wording test applies to it.
const unusable = (kind: string, text: string | null) =>
  !text || !text.trim() || (kind !== 'youtube' && (looksBlocked(text) || text.trim().length < MIN_ARTICLE_CHARS));

type Todo = { id: number; url: string; kind: string; text: string | null; near: Date | null };

// This run takes a long time, so it is natural to stop it and start it again
// - and a stopped `npm run` can leave the tsx process behind it alive, so the
// second run is then the second *writer*. Two of these racing is not just
// slow: each decides a link the other has already moved on from, and an older
// one carrying a since-fixed bug goes on writing its verdicts. Postgres hands
// out the lock and takes it back when the connection ends, however the
// process died, so there is nothing to clean up by hand.
//
// The lock belongs to the connection that took it, and a pooled connection is
// handed back after each query and closed once it has been idle for
// idleTimeoutMillis - which this script spends most of its time being, while
// it waits on the network. So the lock sits on a client of its own, held
// until the run ends.
const LOCK_KEY = 0x7a11c0de;

// Held for the whole run, and released on the way out - including the early
// return a dry run takes. db.closeConnection() ends the pool by waiting for
// every client to come back, so one kept checked out hangs the process
// instead of letting it exit.
let lockClient: pg.PoolClient | undefined;

async function claimTheRun(): Promise<boolean> {
  const client = await db.getPool().connect();
  const { rows } = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_KEY]);
  if (!rows[0].locked) {
    client.release();
    return false;
  }
  lockClient = client;
  return true;
}

// Postgres drops the lock with the session, so a killed process needs no
// clean-up; this is for the ordinary exit.
function releaseTheRun() {
  lockClient?.release();
  lockClient = undefined;
}

async function run() {
  if (!(await claimTheRun())) {
    console.log('another wiki:recover-dead is already running - stop it first (ps aux | grep recoverDead), or wait for it to finish');
    await db.closeConnection();
    process.exitCode = 1;
    return;
  }

  const rows = await db.query<Todo>(
    `SELECT s."id", s."url", s."kind", s."text", MIN(p."utcStartDateTime") AS near
       FROM "Source" s
       JOIN "PinSource" ps ON ps."sourceId" = s."id" AND ps."utcRemovedDateTime" IS NULL
       JOIN "Pin" p ON p."id" = ps."pinId" AND p."utcDeletedDateTime" IS NULL
      WHERE s."wikiVersion" = 0
        AND ($1::integer[] IS NULL OR s."id" = ANY($1::integer[]))
      GROUP BY s."id"
      ORDER BY s."id"`,
    [flags.id ? flags.id.map(Number) : null],
  );

  // A link whose stored text does read is not this script's problem: it is
  // only waiting on a wiki, and reading it again could only replace good text
  // with whatever the site serves today. Those go straight to wiki:export.
  const needText = rows.filter((r) => unusable(r.kind, r.text));
  const haveText = rows.length - needText.length;
  const offset = Number(flags.offset ?? 0);
  const todo = needText.slice(offset, flags.limit ? offset + Number(flags.limit) : undefined);
  console.log(
    `${rows.length} link(s) with no wiki: ${needText.filter((r) => r.text?.trim()).length} holding a wall or error page, ` +
      `${needText.filter((r) => !r.text?.trim()).length} with no text, ${haveText} already readable (they need only a wiki)`,
  );
  console.log(`${todo.length} to read`);
  if (!flags.apply) {
    console.log('dry run: add --apply');
    releaseTheRun();
    await db.closeConnection();
    return;
  }

  const counts = { live: 0, archived: 0, dead: 0, skipped: 0 };
  let done = 0;

  // Nearly every link here is one the live web will not serve, so the minutes
  // go on waiting: a browser launched for a page that was never going to
  // load, then archive.org taking half a minute to answer. Waiting on a few
  // at once is the difference between an evening and an afternoon. It stays
  // low because each worker can launch a browser and archive.org rate-limits
  // a caller that pushes.
  const settle = async (row: Todo) => {
    // A live read first: cheap when it works, and current.
    let got: { title?: string; text: string; where: string } | undefined;
    try {
      const fetched = await fetchSourceText(row.url, row.kind as 'web' | 'tweet' | 'youtube' | 'podcast');
      // fetchSourceText throws on a wall it recognises, but a site can serve
      // its own soft 404 with a 200 and no wall wording at all.
      if (!unusable(row.kind, fetched.text)) got = { ...fetched, where: 'live' };
    } catch {
      // Dead, walled or timed out - the archive is the next thing to try.
    }

    // Told apart from "the archive has no copy": archive.org rate-limits and
    // has its own outages, and a link it could not be asked about is not a
    // link it lacks. Failing one on a 503 would write a verdict that is
    // simply untrue and stop anything looking at it again.
    let archiveAsked = !flags['live-only'];
    if (!got && !flags['live-only']) {
      try {
        const archived = await fetchArchivedText(row.url, row.near ?? undefined);
        if (archived) got = { title: archived.title, text: archived.text, where: `archived ${archived.capture.timestamp.slice(0, 8)}` };
      } catch (err) {
        archiveAsked = false;
        await Source.noteError(row.id, `archive lookup failed: ${(err as Error).message}`);
        console.log(`source ${row.id}: archive unreachable, left alone - ${(err as Error).message.slice(0, 60)}`);
      }
    }

    if (got) {
      await Source.setText(row.id, { text: got.text, title: got.title });
      await Source.markPending(row.id);
      if (got.where === 'live') counts.live++;
      else counts.archived++;
      console.log(`source ${row.id}: ${got.where}, ${got.text.length} chars  ${row.url.slice(0, 70)}`);
    } else if (archiveAsked) {
      counts.dead++;
      // Recorded as a verdict rather than left pending, so this link stops
      // being counted as work waiting to be done. Only written when the
      // archive actually answered and had nothing.
      await Source.markFailed(
        row.id,
        `Blocked: no readable copy of this page - the live URL serves a wall, a redirect or nothing, and the Internet Archive has no usable capture of it. Its pin's summary is built from the links that do read.`,
      );
      console.log(`source ${row.id}: DEAD                       ${row.url.slice(0, 70)}`);
    } else {
      counts.skipped++;
      console.log(`source ${row.id}: not settled, try again      ${row.url.slice(0, 70)}`);
    }
    done++;
    if (done % 20 === 0) console.log(`-- ${done} of ${todo.length} settled`);
  };

  // Each worker takes the next link off the one queue, so a slow link holds
  // up only itself.
  const queue = [...todo];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      await settle(row);
      await sleep(DELAY_MS);
    }
  });
  await Promise.all(workers);

  console.log(`\nread live: ${counts.live}, from the archive: ${counts.archived}, dead: ${counts.dead}, unsettled: ${counts.skipped}`);
  if (counts.skipped) console.log('the archive could not be reached for the unsettled ones - run again to finish them');
  console.log('next: npm run wiki:export -- --out DIR   (or wiki:sync, with credit)');
  releaseTheRun();
  await db.closeConnection();
}

// A throw part-way through must not leave the lock client checked out, or the
// process hangs on the way out instead of reporting what went wrong.
run().catch(async (err) => {
  console.error(err);
  releaseTheRun();
  await db.closeConnection();
  process.exitCode = 1;
});
