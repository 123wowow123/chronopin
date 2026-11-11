// A pin's pro tips (PinProTip, 0256). Many rows per pin, shown in position order.
import * as db from '../db';
import { MAX_PRO_TIPS, type PinProTipJson } from '@/lib/pinProTip';

export async function proTipsForPin(pinId: number): Promise<PinProTipJson[]> {
  return db.query<PinProTipJson>(
    `SELECT "tip", "sourceUrl" FROM "PinProTip" WHERE "pinId" = $1 ORDER BY "position", "id" LIMIT ${MAX_PRO_TIPS}`,
    [pinId],
  );
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
