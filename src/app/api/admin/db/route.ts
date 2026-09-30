import type { NextRequest } from 'next/server';
import { catalog } from '@/server/adminDb';
import { requireRole } from '@/server/auth';
import { json, route } from '@/server/http';

// The admin table API's tables (docs/okf/api/admin-db.md): each with its
// columns, primary key, whether it can be written here, and notes on what to
// use instead where it cannot.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json({ tables: [...(await catalog()).values()] });
});
