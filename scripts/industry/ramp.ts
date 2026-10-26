// Refreshes the Ramp token volume, spend and price panels (weekly lines from
// ramp.com/data/ai-index). Run npm run industry:forecasts first so the rows exist.
//
//   npm run industry:ramp

import '../env';
import { refreshRampTokens } from '@/server/jobs/rampTokens';

console.log(await refreshRampTokens());
process.exit(0);
