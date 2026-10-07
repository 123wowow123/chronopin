// Attach reviewed local images to existing restaurant pins. The opening seed
// deliberately skips existing pins, so image enrichment runs separately.
import '../env';
import sharp from 'sharp';
import media from './mediaBackfill.json';
import * as db from '@/server/db';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

try {
  const dimensions = await Promise.all(media.map((item) => sharp(`public${item.image}`).metadata()));
  const changed = await db.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(731906)');
    const ids: number[] = [];
    for (const [index, item] of media.entries()) {
      const [pin] = await query<{ id: number; longFormSummary: string | null }>(
        `SELECT "id", "longFormSummary" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL FOR UPDATE`,
        [item.pinSourceUrl],
      );
      if (!pin) continue;
      const existing = await query<{ id: number; thumbName: string }>(`SELECT m."id", m."thumbName" FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId" WHERE pm."pinId" = $1 AND pm."utcDeletedDateTime" IS NULL AND m."type" = '1'`, [pin.id]);
      if (existing.length && !existing.some((medium) => medium.thumbName === item.image)) continue;
      const image = dimensions[index];
      const caption = [item.imageCredit, item.imageNote].filter(Boolean).join(' · ');
      const license = item.license && item.licenseUrl
        ? ` · <a href="${escapeHtml(item.licenseUrl)}">${escapeHtml(item.license)}</a>` : '';
      const credit = `<p data-restaurant-image-credit="true"><a href="${escapeHtml(item.imageSourceUrl)}">${escapeHtml(caption)}</a>${license}.</p>`;
      const summary = (pin.longFormSummary ?? '').replace(/<p data-restaurant-image-credit="true">[\s\S]*?<\/p>/g, '') + credit;
      let updated = false;
      if (summary !== (pin.longFormSummary ?? '')) {
        await query(`UPDATE "Pin" SET "longFormSummary" = $1 WHERE "id" = $2`, [summary, pin.id]);
        updated = true;
      }
      if (existing.length) {
        const medium = existing.find((medium) => medium.thumbName === item.image)!;
        const updatedMedia = await query(`UPDATE "Medium" SET "authorName" = $1, "authorUrl" = $2 WHERE "id" = $3 AND ("authorName" IS DISTINCT FROM $1 OR "authorUrl" IS DISTINCT FROM $2) RETURNING "id"`, [caption, item.imageSourceUrl, medium.id]);
        if (updated || updatedMedia.length) ids.push(pin.id);
        continue;
      }
      const [medium] = await query<{ id: number }>(
        `INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight", "authorName", "authorUrl") VALUES ('1', $1, $2, $3, $1, $2, $3, $4, $5) RETURNING "id"`,
        [item.image, image.width, image.height, caption, item.imageSourceUrl],
      );
      await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2)`, [pin.id, medium.id]);
      ids.push(pin.id);
    }
    return ids;
  });
  console.log(JSON.stringify({ changed: changed.length, pinIds: changed }));
  console.log('Invalidate these pin caches and the timeline cache in the running Next.js app before verifying the pages.');
} finally {
  await db.closeConnection();
}
