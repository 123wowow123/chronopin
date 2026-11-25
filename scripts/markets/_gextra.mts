import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const ai = [
  { label: 'Qwen', person: 'Qwen (Alibaba)', imageSource: 'https://cdn.simpleicons.org/qwen/615CED', authorName: 'Simple Icons (Qwen logo)', authorUrl: 'https://simpleicons.org/?q=qwen' },
  { label: 'Ernie', person: 'Ernie (Baidu)', imageSource: 'https://cdn.simpleicons.org/baidu/2932E1', authorName: 'Simple Icons (Baidu logo)', authorUrl: 'https://simpleicons.org/?q=baidu' },
];
for (const pin of [1989, 1990]) console.log(pin, JSON.stringify((await savePhotosPartial(pin, ai.map((x) => ({ ...x, kind: 'logo' as const })))).failed));
console.log(20769, JSON.stringify((await savePhotosPartial(20769, [{ label: 'Labour Party', person: 'New Zealand Labour Party', kind: 'logo', imageSource: 'https://www.labour.org.nz/media/u2blonkk/nz-labour-og.png', authorName: 'New Zealand Labour Party (labour.org.nz)', authorUrl: 'https://www.labour.org.nz' }])).failed));
console.log(1979, JSON.stringify((await savePhotosPartial(1979, [{ label: 'New Democratic Party', person: 'New Democratic Party of Canada', kind: 'logo', imageSource: 'https://www.ndp.ca/canadandp-logo-orange-en.svg', authorName: 'NDP (ndp.ca)', authorUrl: 'https://www.ndp.ca' }])).failed));
await db.closeConnection(); process.exit(0);
