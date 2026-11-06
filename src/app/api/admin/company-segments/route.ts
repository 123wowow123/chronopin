import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { companySegments, hubPinOfCompany, saveCompanySegments } from '@/server/model/companyHub';
import { query } from '@/server/db';
import { invalidatePin } from '@/server/services/cache';

// A company's revenue by segment and quarter, docs/okf/api/company-hub.md.
//   GET ?company=Tesla -> { rows }
//   PUT { company, rows: [{ period: 'Q2 2026', periodEnd: '2026-06-30', segment, amountBillions, pinId }] }
//     replaces every row. pinId is the results pin that reports the figure
//     (required, so each number is sourced). Admin only.
const headers = { 'Cache-Control': 'private, no-store' };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function companyByName(name: unknown) {
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, '', { message: 'company is required.' });
  const rows = await query<{ id: number; name: string }>(`SELECT "id", "name" FROM "Company" WHERE "name" = $1`, [name.trim()]);
  if (!rows[0]) throw new HttpError(404, '', { message: `No company named ${name}.` });
  return rows[0];
}

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const company = await companyByName(request.nextUrl.searchParams.get('company'));
  return json({ rows: await companySegments(company.id) }, 200, headers);
});

export const PUT = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson(request);
  const company = await companyByName(body.company);
  const list: unknown[] = Array.isArray(body.rows) ? body.rows : [];
  const rows = list.map((r, i) => {
    const x = r as Record<string, unknown>;
    if (typeof x.period !== 'string' || !x.period.trim() || typeof x.segment !== 'string' || !x.segment.trim()) throw new HttpError(400, '', { message: `Row ${i}: period and segment are required.` });
    if (typeof x.periodEnd !== 'string' || !DAY.test(x.periodEnd)) throw new HttpError(400, '', { message: `Row ${i}: periodEnd must be YYYY-MM-DD.` });
    if (typeof x.amountBillions !== 'number' || !Number.isFinite(x.amountBillions)) throw new HttpError(400, '', { message: `Row ${i}: amountBillions must be a number.` });
    if (!Number.isInteger(x.pinId)) throw new HttpError(400, '', { message: `Row ${i}: pinId (the results pin) is required.` });
    return { period: x.period.trim(), periodEnd: x.periodEnd, segment: x.segment.trim(), amountBillions: x.amountBillions, pinId: x.pinId as number };
  });
  const ids = [...new Set(rows.map((r) => r.pinId))];
  const found = ids.length ? await query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "id" = ANY($1::integer[]) AND "companyId" = $2 AND "utcDeletedDateTime" IS NULL`, [ids, company.id]) : [];
  const missing = ids.filter((id) => !found.some((f) => f.id === id));
  if (missing.length) throw new HttpError(400, '', { message: `Not ${company.name} pins: ${missing.join(', ')}.` });
  await saveCompanySegments(company.id, rows);
  // The landing page's cache is tagged by its hub pin, so a save drops that too.
  const hub = await hubPinOfCompany(company.id);
  for (const id of [...ids, ...(hub ? [hub] : [])]) invalidatePin(id);
  return json({ rows: await companySegments(company.id) }, 200, headers);
});
