import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { companyHubTree, hubPinIds, hubPinOfCompany, hubProductsProblem, saveCompanyHub } from '@/server/model/companyHub';
import { query } from '@/server/db';
import { invalidatePin } from '@/server/services/cache';

// A company's hub (landing) pin and product tree, docs/okf/api/company-hub.md.
//   GET ?company=Tesla -> { hubPinId, tree }
//   PUT { company, hubPinId, products: [{ name, summary?, pinIds?, children? }] }
//     replaces the hub pin and the whole tree. pinIds are pins of the
//     product's threads (each shows its whole thread). Admin only.
const headers = { 'Cache-Control': 'private, no-store' };

async function companyByName(name: unknown) {
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, '', { message: 'company is required.' });
  const rows = await query<{ id: number; name: string }>(`SELECT "id", "name" FROM "Company" WHERE "name" = $1`, [name.trim()]);
  if (!rows[0]) throw new HttpError(404, '', { message: `No company named ${name}.` });
  return rows[0];
}

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const company = await companyByName(request.nextUrl.searchParams.get('company'));
  return json({ hubPinId: await hubPinOfCompany(company.id), tree: await companyHubTree(company.id, company.name) }, 200, headers);
});

export const PUT = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson(request);
  const company = await companyByName(body.company);
  const hubPinId = body.hubPinId;
  if (!Number.isInteger(hubPinId) || hubPinId < 1) throw new HttpError(400, '', { message: 'hubPinId must be a pin id.' });
  const products = hubProductsProblem(body.products ?? []);
  if (typeof products === 'string') throw new HttpError(400, '', { message: products });
  const pins = await query<{ id: number; companyId: number | null }>(`SELECT "id", "companyId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [hubPinId]);
  if (!pins[0]) throw new HttpError(404, '', { message: `No pin ${hubPinId}.` });
  if (pins[0].companyId !== company.id) throw new HttpError(400, '', { message: `Pin ${hubPinId} is not a ${company.name} pin.` });
  const before = await hubPinIds(company.id);
  try {
    await saveCompanyHub(company.id, hubPinId, products);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new HttpError(409, '', { message: 'That pin already is another company\'s hub, or two sibling products share a name.' });
    throw e;
  }
  for (const id of new Set([...before, ...(await hubPinIds(company.id))])) invalidatePin(id);
  return json({ hubPinId, tree: await companyHubTree(company.id, company.name) }, 200, headers);
});
