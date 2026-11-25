import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const si = (slug: string, color: string) => `https://cdn.simpleicons.org/${slug}/${color}`;
const plan: Record<number, any[]> = {
  1989: [
    { label: 'Gemini', person: 'Google Gemini', imageSource: si('googlegemini', '8E75B2'), authorName: 'Simple Icons (Google Gemini logo)', authorUrl: 'https://simpleicons.org/?q=gemini' },
    { label: 'Claude', person: 'Claude (Anthropic)', imageSource: si('claude', 'D97757'), authorName: 'Simple Icons (Claude logo)', authorUrl: 'https://simpleicons.org/?q=claude' },
  ],
  20116: [
    { label: 'Goldman Sachs', person: 'Goldman Sachs', imageSource: si('goldmansachs', '7399C6'), authorName: 'Simple Icons (Goldman Sachs logo)', authorUrl: 'https://simpleicons.org/?q=goldman' },
    { label: 'Bank of America', person: 'Bank of America', imageSource: si('bankofamerica', 'E31837'), authorName: 'Simple Icons (Bank of America logo)', authorUrl: 'https://simpleicons.org/?q=bank+of+america' },
  ],
};
for (const [pid, rows] of Object.entries(plan)) { const r = await savePhotosPartial(Number(pid), rows.map((x) => ({ ...x, kind: 'logo' }))); console.log(pid, r.saved.length, JSON.stringify(r.failed)); }
// 1990 shares labels with 1989
{ const r = await savePhotosPartial(1990, plan[1989].map((x) => ({ ...x, kind: 'logo' }))); console.log(1990, r.saved.length, JSON.stringify(r.failed)); }
await db.closeConnection(); process.exit(0);
