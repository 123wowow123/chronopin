import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { AUDIT_CHECKS, runAuditCheck, type AuditCheck, type AuditResult } from '@/server/services/translationAudit';

// The translation health check, run on the server so an agent without SSH to
// the VM can audit production (check_translations.py falls back to this).
//
//   GET ?only=counts,mangled&sinceDays=7
//     checks: counts, leak_pin, leak_translation, mangled, bullets, panels, pro_tips
//     (default: all, one after another; bullets is the slow one, about 80 s, so
//     ask for it alone or pass sinceDays, which limits it to rows written in the
//     last N days). Answers { checks: { <name>: { ms, data } } }.
export const maxDuration = 300;

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  const asked = (params.get('only') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = asked.filter((name) => !(AUDIT_CHECKS as readonly string[]).includes(name));
  if (unknown.length) throw new HttpError(400, '', { message: `only takes ${AUDIT_CHECKS.join(', ')}` });
  const sinceRaw = params.get('sinceDays');
  const sinceDays = sinceRaw === null ? undefined : Number(sinceRaw);
  if (sinceDays !== undefined && (!Number.isInteger(sinceDays) || sinceDays < 1 || sinceDays > 3650)) {
    throw new HttpError(400, '', { message: 'sinceDays takes a whole number of days, 1 to 3650' });
  }
  const names = (asked.length ? AUDIT_CHECKS.filter((c) => asked.includes(c)) : [...AUDIT_CHECKS]) as AuditCheck[];
  const checks: Record<string, Pick<AuditResult, 'ms' | 'data'>> = {};
  for (const name of names) {
    const { ms, data } = await runAuditCheck(name, sinceDays);
    checks[name] = { ms, data };
  }
  return json({ checks });
});
