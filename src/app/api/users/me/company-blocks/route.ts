import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import CompanyBlock from '@/server/model/companyBlock';

// The companies the signed-in reader blocked, most recent first (0078).
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json(await CompanyBlock.list(user.id));
});
