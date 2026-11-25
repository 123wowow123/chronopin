import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const iso: Record<string, string> = { Denmark: 'dk', Finland: 'fi', Iceland: 'is', 'Costa Rica': 'cr', Israel: 'il', Sweden: 'se', Norway: 'no', Netherlands: 'nl', Luxembourg: 'lu', Switzerland: 'ch', 'United States': 'us', China: 'cn', Russia: 'ru', India: 'in', 'European Space Agency': 'eu', Europe: 'eu', USA: 'us' };
const pins: Record<number, string[]> = {
  21047: ['Denmark', 'Finland', 'Iceland', 'Costa Rica', 'Israel', 'Sweden', 'Norway', 'Netherlands', 'Luxembourg', 'Switzerland'],
  1993: ['United States', 'China', 'Russia', 'India', 'European Space Agency'],
  2076: ['Europe', 'USA'],
};
for (const [pid, labels] of Object.entries(pins)) {
  const rows = labels.map((label) => ({ label, person: label === 'European Space Agency' ? 'European Union flag (ESA is European)' : label, kind: 'logo' as const, imageSource: `https://flagcdn.com/w640/${iso[label]}.png`, authorName: 'Flagcdn', authorUrl: 'https://flagcdn.com' }));
  const r = await savePhotosPartial(Number(pid), rows);
  console.log(pid, 'saved', r.saved.length, JSON.stringify(r.failed));
}
await db.closeConnection(); process.exit(0);
