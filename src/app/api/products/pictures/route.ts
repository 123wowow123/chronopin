import type { NextRequest } from 'next/server';
import { isAdmin, requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import ProductPicture from '@/server/model/productPicture';

// Pictures for product lines none of whose pins has one (0079). The server
// never looks them up itself: `npm run products:pictures -- --prod` on the dev
// machine asks which are missing (GET), finds them there, and sends back only
// the result (PUT).

// ?companyId= narrows to one company; ?retry=1 adds the ones looked up and not found.
export const GET = route(async (request: NextRequest) => {
  await requireRole('user', request);
  const params = request.nextUrl.searchParams;
  const companyId = params.get('companyId');
  return json(await ProductPicture.needing({ companyId: companyId ? intParam(companyId) : undefined, retry: params.get('retry') === '1' }));
});

type Body = { companyId?: unknown; product?: unknown; pictureUrl?: unknown; source?: unknown; pageUrl?: unknown };

const SOURCES = new Set(['wikipedia', 'google', 'hand']);
const httpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
};

// [{ companyId, product, pictureUrl (null: none found), source, pageUrl }]. An
// admin may set any product's picture; anyone else only one for a product
// they have pinned, so a curator's run can fill in its own batch.
export const PUT = route(async (request: NextRequest) => {
  const user = await requireRole('user', request);
  const body = await readJson<Body[]>(request);
  if (!Array.isArray(body) || body.length > 200) throw new HttpError(400, '', { message: 'Expected an array of at most 200 pictures' });
  let saved = 0;
  const refused: { companyId: unknown; product: unknown; reason: string }[] = [];
  for (const row of body) {
    const companyId = Number(row.companyId);
    const product = typeof row.product === 'string' ? row.product.trim().slice(0, 80) : '';
    const pictureUrl = row.pictureUrl == null ? null : httpsUrl(row.pictureUrl);
    const source = typeof row.source === 'string' && SOURCES.has(row.source) ? row.source : null;
    if (!Number.isInteger(companyId) || companyId < 1 || !product || (row.pictureUrl != null && !pictureUrl)) {
      refused.push({ companyId: row.companyId, product: row.product, reason: 'invalid' });
      continue;
    }
    if (!isAdmin(user) && !(await ProductPicture.hasPinned(user.id, companyId, product))) {
      refused.push({ companyId, product, reason: 'not your product' });
      continue;
    }
    await ProductPicture.set({ companyId, product, pictureUrl, source, pageUrl: httpsUrl(row.pageUrl) });
    saved++;
  }
  return json({ saved, refused });
});
