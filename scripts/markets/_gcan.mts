import { outcomePhotosForPin, savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const rows = await outcomePhotosForPin(1956);
const m = rows.find((r) => /montr/i.test(r.label)); console.log(m?.label, m?.imageSource);
if (m?.imageSource) console.log(JSON.stringify((await savePhotosPartial(1956, [{ label: 'Montréal Canadiens', person: 'Montréal Canadiens', kind: 'logo', imageSource: m.imageSource, authorName: 'ESPN team logo', authorUrl: m.authorUrl ?? 'https://www.espn.com' }])).failed));
const a = (await outcomePhotosForPin(1957)).filter((r) => /atl/i.test(r.label)).map((r) => r.label); console.log(a);
await db.closeConnection(); process.exit(0);
