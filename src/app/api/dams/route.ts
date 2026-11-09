import { aggregateDams } from '@/lib/damSpecs';
import { json, route } from '@/server/http';
import { damRows } from '@/server/model/pinDam';

// Public: every pin with a dam row plus the totals and the per-state sums the /dams page draws.
export const GET = route(async () => {
  const rows = await damRows();
  return json({ ...aggregateDams(rows), dams: rows });
});
