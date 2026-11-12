// A pin's pro tips (PinProTip, 0256) and their translations (PinProTipTranslation, 0264).
// Many rows per pin, shown in position order.
import { createHash } from 'node:crypto';
import { isLocale, type Locale } from '@/lib/i18n/config';
import * as db from '../db';
import { MAX_PRO_TIPS, type PinProTipJson } from '@/lib/pinProTip';

export const PRO_TIP_TRANSLATION_MAX = 1500;
export const proTipHash = (tip: string) => createHash('sha1').update(tip).digest('hex');

// The pin's tips; in a language other than English each tip is swapped for
// its translation when one was made from the tip as stored now.
export async function proTipsForPin(pinId: number, locale: Locale = 'en'): Promise<PinProTipJson[]> {
  const rows = await db.query<PinProTipJson & { id: number }>(
    `SELECT "id", "tip", "sourceUrl" FROM "PinProTip" WHERE "pinId" = $1 ORDER BY "position", "id" LIMIT ${MAX_PRO_TIPS}`,
    [pinId],
  );
  let words = new Map<number, { tip: string; sourceHash: string }>();
  if (locale !== 'en' && rows.length) {
    const found = await db.query<{ proTipId: number; tip: string; sourceHash: string }>(
      `SELECT "proTipId", "tip", "sourceHash" FROM "PinProTipTranslation" WHERE "locale" = $1 AND "proTipId" = ANY($2::integer[])`,
      [locale, rows.map((r) => r.id)],
    );
    words = new Map(found.map((r) => [r.proTipId, r]));
  }
  return rows.map(({ id, tip, sourceUrl }) => {
    const row = words.get(id);
    return { tip: row && row.sourceHash.trim() === proTipHash(tip) ? row.tip : tip, sourceUrl };
  });
}

// Replaces the pin's whole tip list in one transaction.
export async function saveProTips(pinId: number, tips: PinProTipJson[]) {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinProTip" WHERE "pinId" = $1`, [pinId]);
    for (const [i, t] of tips.entries()) {
      await query(`INSERT INTO "PinProTip" ("pinId", "tip", "sourceUrl", "position") VALUES ($1,$2,$3,$4)`, [pinId, t.tip, t.sourceUrl, i]);
    }
  });
}

export async function deleteProTips(pinId: number) {
  await db.query(`DELETE FROM "PinProTip" WHERE "pinId" = $1`, [pinId]);
}

export type ProTipToTranslate = { proTipId: number; pinId: number; tip: string; sourceHash: string; locales: string[] };
export type ProTipTranslationInput = { proTipId: number; locale: string; sourceHash: string; tip: string };

// Tips of live pins with a language lacking a current translation.
export async function proTipsToTranslate(locales: readonly string[], limit = 200, after = 0): Promise<ProTipToTranslate[]> {
  const tips = await db.query<{ id: number; pinId: number; tip: string }>(
    `SELECT t."id", t."pinId", t."tip" FROM "PinProTip" t JOIN "Pin" p ON p."id" = t."pinId"
      WHERE p."utcDeletedDateTime" IS NULL AND t."id" > $1 ORDER BY t."id" LIMIT $2`,
    [after, limit],
  );
  if (!tips.length) return [];
  const have = await db.query<{ proTipId: number; locale: string; sourceHash: string }>(
    `SELECT "proTipId", "locale", "sourceHash" FROM "PinProTipTranslation" WHERE "proTipId" = ANY($1::integer[])`,
    [tips.map((t) => t.id)],
  );
  const current = new Set(have.map((r) => `${r.proTipId}:${r.locale}:${r.sourceHash.trim()}`));
  const out: ProTipToTranslate[] = [];
  for (const t of tips) {
    const hash = proTipHash(t.tip);
    const missing = locales.filter((l) => !current.has(`${t.id}:${l}:${hash}`));
    if (missing.length) out.push({ proTipId: t.id, pinId: t.pinId, tip: t.tip, sourceHash: hash, locales: missing });
  }
  return out;
}

// Saves hand translations, skipping a row for a tip that is gone, was
// replaced since the hash was taken, or whose words are empty or too long.
export async function applyProTipTranslations(rows: ProTipTranslationInput[]) {
  const skipped: { proTipId: number; locale: string; reason: string }[] = [];
  let saved = 0;
  const ids = [...new Set(rows.map((r) => r.proTipId))].filter((id) => Number.isInteger(id));
  const tips = ids.length ? await db.query<{ id: number; tip: string }>(`SELECT "id", "tip" FROM "PinProTip" WHERE "id" = ANY($1::integer[])`, [ids]) : [];
  const current = new Map(tips.map((t) => [t.id, proTipHash(t.tip)]));
  for (const row of rows) {
    const skip = (reason: string) => skipped.push({ proTipId: row.proTipId, locale: row.locale, reason });
    const tip = typeof row.tip === 'string' ? row.tip.trim() : '';
    if (!isLocale(row.locale) || row.locale === 'en') skip('not a language the site translates into');
    else if (!current.has(row.proTipId)) skip('no such tip');
    else if (current.get(row.proTipId) !== row.sourceHash) skip('the tip changed since');
    else if (!/[\p{L}\p{N}]/u.test(tip) || tip.length > PRO_TIP_TRANSLATION_MAX) skip('empty or too long');
    else {
      await db.query(
        `INSERT INTO "PinProTipTranslation" ("proTipId", "locale", "tip", "sourceHash") VALUES ($1, $2, $3, $4)
         ON CONFLICT ("proTipId", "locale") DO UPDATE SET "tip" = EXCLUDED."tip", "sourceHash" = EXCLUDED."sourceHash", "utcUpdatedDateTime" = now()`,
        [row.proTipId, row.locale, tip, row.sourceHash],
      );
      saved++;
    }
  }
  return { saved, skipped };
}
