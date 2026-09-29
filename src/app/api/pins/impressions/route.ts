import { userAgent, type NextRequest } from 'next/server';
import { HttpError, noContent, readJson, route } from '@/server/http';
import PinImpression from '@/server/model/pinImpression';
import { viewerKey } from '@/server/visitor';

// More than a screenful of cards ever sends at once.
const MAX_IDS = 200;

// Counts the timeline cards a viewer has seen ({ ids: [pin ids] }, sent in
// batches by src/lib/client/impressions.ts). Crawlers are ignored.
export const POST = route(async (request: NextRequest) => {
  const { ids } = await readJson<{ ids?: unknown }>(request);
  if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new HttpError(400, 'Bad Request');
  }
  if (userAgent(request).isBot) {
    return noContent();
  }
  await PinImpression.record([...new Set(ids as number[])], await viewerKey(request));
  return noContent();
});
