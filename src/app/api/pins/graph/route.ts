import type { NextRequest } from 'next/server';
import { HttpError, json, readJson, route } from '@/server/http';
import { MAX_GRAPH_PINS, pinGraph } from '@/server/services/pinGraph';

// POST /api/pins/graph { ids: [1, 2, 3] }
// How those pins relate to each other: { edges: [{ a, b, kind, label? }] }.
// A POST because the map sends every pin it shows, too many for a URL.
export const POST = route(async (request: NextRequest) => {
  const { ids } = await readJson<{ ids?: unknown }>(request);
  if (!Array.isArray(ids) || ids.length > MAX_GRAPH_PINS || !ids.every((id) => Number.isInteger(id))) {
    throw new HttpError(400, `ids must be an array of at most ${MAX_GRAPH_PINS} pin ids`);
  }
  return json({ edges: await pinGraph(ids as number[]) });
});
