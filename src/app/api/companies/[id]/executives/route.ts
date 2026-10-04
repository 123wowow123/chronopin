import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Company from '@/server/model/company';
import CompanyExecutive, { type CompanyExecutiveInput } from '@/server/model/companyExecutive';

type Ctx = RouteContext<'/api/companies/[id]/executives'>;

async function companyId(ctx: Ctx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '', { message: 'company id must be a positive integer' });
  if (!(await Company.getById(id))) throw new HttpError(404, 'Not Found');
  return id;
}

export const GET = route(async (_request: NextRequest, ctx: Ctx) => json(await CompanyExecutive.forCompany(await companyId(ctx))));

const httpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
};
const amount = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1e12 ? Math.round(value) : null);

// The company's C-suite, as the dev machine's `companies:executives` run found
// it: [{ name, title, salary, totalCompensation, currency, fiscalYear,
// sourceUrl }], replacing the list (an empty array clears it). Admin only: the
// figures are quoted as the company's own.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = await companyId(ctx);
  const body = await readJson<Record<string, unknown>[]>(request);
  if (!Array.isArray(body) || body.length > 30) throw new HttpError(400, '', { message: 'Expected an array of at most 30 executives' });
  const list: CompanyExecutiveInput[] = [];
  for (const row of body) {
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 200) : '';
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 200) : '';
    if (!name || !title) throw new HttpError(400, '', { message: 'Every executive needs a name and a title' });
    const year = Number(row.fiscalYear);
    list.push({
      name,
      title,
      salary: amount(row.salary),
      totalCompensation: amount(row.totalCompensation),
      currency: typeof row.currency === 'string' && /^[A-Za-z]{3}$/.test(row.currency) ? row.currency : 'USD',
      fiscalYear: Number.isInteger(year) && year > 1990 && year < 2100 ? year : null,
      sourceUrl: httpsUrl(row.sourceUrl),
      origin: row.origin === 'sec' ? 'sec' : 'hand',
    });
  }
  await CompanyExecutive.replace(id, list);
  return json({ saved: list.length });
});
