import type { NextRequest } from 'next/server';
import { isAdmin, requireRole } from '@/server/auth';
import { clampSentiment } from '@/server/extract/pinSentiment';
import { HttpError, json, readJson, route } from '@/server/http';
import PinSentiment, { sameText, shortHash } from '@/server/model/pinSentiment';
import { expirePinPage, invalidateTimeline } from '@/server/services/cache';

// Company pins' news tone (0068) scored somewhere else and sent here. Prod's
// key may have no credit, so `npm run companies:sentiment -- --prod` on the
// dev machine asks which pins need a score (GET), and sends back the scores
// it has for the same text (PUT).

// [{ id, textHash }]: live company pins with no score, or one read from text
// since changed. textHash is the short hash a score must come back with.
export const GET = route(async (request: NextRequest) => {
  await requireRole('user', request);
  const pins = await PinSentiment.unscored(100_000);
  return json(pins.map((pin) => ({ id: pin.id, textHash: shortHash(pin) })));
});

type Body = { id?: unknown; sentiment?: unknown; product?: unknown; textHash?: unknown };

// [{ id, sentiment (-1..1), product ("" for none; left out: not read), textHash }].
// A score is kept only while the pin's text still hashes to textHash. An admin
// may score any pin; anyone else only pins they posted, so a curator's token
// fills in its own desk's.
export const PUT = route(async (request: NextRequest) => {
  const user = await requireRole('user', request);
  const body = await readJson<Body[]>(request);
  if (!Array.isArray(body) || body.length > 200) throw new HttpError(400, '', { message: 'Expected an array of at most 200 scores' });
  let saved = 0;
  const refused: { id: unknown; reason: string }[] = [];
  for (const row of body) {
    const id = Number(row.id);
    const sentiment = Number(row.sentiment);
    const textHash = typeof row.textHash === 'string' ? row.textHash : '';
    if (!Number.isInteger(id) || id < 1 || typeof row.sentiment !== 'number' || !Number.isFinite(sentiment) || !textHash) {
      refused.push({ id: row.id, reason: 'invalid' });
      continue;
    }
    const context = await PinSentiment.context(id);
    if (!context) {
      refused.push({ id, reason: 'not a live company pin' });
      continue;
    }
    if (!isAdmin(user) && context.userId !== user.id) {
      refused.push({ id, reason: 'not your pin' });
      continue;
    }
    if (!sameText(context, textHash)) {
      refused.push({ id, reason: 'text changed' });
      continue;
    }
    await PinSentiment.set(id, context, clampSentiment(sentiment), typeof row.product === 'string' ? row.product : undefined);
    expirePinPage(id);
    saved++;
  }
  if (saved) invalidateTimeline();
  return json({ saved, refused });
});
