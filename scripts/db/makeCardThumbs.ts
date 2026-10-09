// Backfill landscape card renditions, leaving every original and full thumb intact.
// npm run thumbs:cards -- --pin-ids 7017,7018
// npm run thumbs:cards                      all existing media
import '../env';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { blobUrl, cardThumbName, thumbUrlPrefix } from '@/lib/appConfig';
import { getBlobUrl } from '@/server/azureBlob';
import { downloadImage, uploadCardThumb } from '@/server/image';
import { createCardThumb } from '@/server/cardThumb';
import * as db from '@/server/db';

const { values } = parseArgs({ options: { 'pin-ids': { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
const ids = values['pin-ids']?.split(',').map(Number);
if (ids?.some((id) => !Number.isInteger(id) || id < 1)) throw new Error('--pin-ids must be positive integers');
try {
  const rows = await db.query<{ name: string }>(`SELECT DISTINCT m."thumbName" AS name FROM "Medium" m
    JOIN "PinMedium" pm ON pm."mediumId" = m.id WHERE m."thumbName" IS NOT NULL
      AND m."utcDeletedDateTime" IS NULL AND pm."utcDeletedDateTime" IS NULL
      AND ($1::integer[] IS NULL OR pm."pinId" = ANY($1))`, [ids ?? null]);
  let made = 0, present = 0;
  for (const { name } of rows) {
    const prefix = [thumbUrlPrefix, 'https://chronopin.blob.core.windows.net/thumb/'].find((value) => name.startsWith(value));
    const relative = prefix ? name.slice(prefix.length) : name;
    if (/^https?:\/\//i.test(relative) || relative.startsWith('/')) continue;
    const url = getBlobUrl(cardThumbName(relative));
    const existing = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
    if (existing.ok) { present++; continue; }
    if (existing.status !== 404) throw new Error(`Checking card failed: ${existing.status} ${url}`);
    if (values['dry-run']) { console.log(`Would create ${url}`); continue; }
    const input = await downloadImage(blobUrl(name)!);
    const expected = await createCardThumb(input);
    await uploadCardThumb(relative, input);
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Public card unavailable: ${url}`);
    const actual = Buffer.from(await response.arrayBuffer());
    const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
    if (hash(actual) !== hash(expected)) throw new Error(`Public card mismatch: ${url}`);
    console.log(`Verified ${url}`); made++;
  }
  console.log(`${made} card thumbnails created; ${present} already present.`);
} finally { await db.closeConnection(); }
