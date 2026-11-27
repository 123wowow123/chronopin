// Refreshes the GPU rental price panel (daily lines from data.ornn.com), merged
// into the days already stored. Run npm run industry:forecasts first so the row exists.
//
//   npm run industry:ornn

import '../env';
import { refreshOrnnGpuPrices } from '@/server/jobs/ornnGpuPrices';

console.log(await refreshOrnnGpuPrices());
process.exit(0);
