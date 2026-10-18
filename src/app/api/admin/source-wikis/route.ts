import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Source from '@/server/model/source';
import { applyPrebuiltWikis, MAX_PREBUILT_WIKIS, parsePrebuiltWikis } from '@/server/services/prebuiltWikis';

// Link wikis written by hand - a Claude Code session on the dev machine, when
// the app's Anthropic key has no credit - sent to the app instead of written by
// it (services/prebuiltWikis.ts). The same exchange wiki:export / wiki:apply
// make against a local database, over the API, keyed by link.
//
//   GET  ?limit=100&offset=0&pinId=&retryFailed=1   the links waiting on a wiki, each
//        { id, url, kind, title, status, wikiVersion, attempts, lastError, hasText,
//        pinIds } (a pending link with wikiVersion > 0 is one whose page changed),
//        with total: how many wait
//   POST { wikis: [{ url, wiki, kind?, title?, text?, generatedBy? }], rewrite? }
//        saves each wiki on its link; answers { results: [{ url, status:
//        saved | unchanged | skipped | error, ... }] }. A link whose wiki is ready
//        is unchanged unless rewrite is set; a link no pin cites is
//        skipped. At most 25 per request.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 1000);
  const offset = Math.max(Number(params.get('offset')) || 0, 0);
  const pinId = Number(params.get('pinId')) || undefined;
  const force = ['1', 'true'].includes(params.get('retryFailed') ?? '');
  return json(await Source.pendingList({ pinId, limit, offset, force }));
});

export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const { wikis, rewrite } = await readJson<{ wikis?: unknown; rewrite?: unknown }>(request);
  if (!Array.isArray(wikis) || !wikis.length) {
    throw new HttpError(400, '', { message: `Expected { wikis: [...] }, at most ${MAX_PREBUILT_WIKIS}` });
  }
  if (rewrite !== undefined && typeof rewrite !== 'boolean') throw new HttpError(400, '', { message: 'rewrite is a boolean' });
  const results = await applyPrebuiltWikis(parsePrebuiltWikis(wikis), { rewrite });
  return json({ results });
});
