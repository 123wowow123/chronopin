import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
const leagues: Record<number, string[]> = { 1954: ['football/nfl'], 1955: ['basketball/nba'], 1956: ['hockey/nhl'], 1957: ['soccer/UEFA.CHAMPIONS', 'soccer/eng.1', 'soccer/esp.1', 'soccer/ita.1', 'soccer/ger.1', 'soccer/fra.1'], 19332: ['soccer/eng.1'], 20639: ['soccer/usa.1'] };
const extra: Record<number, Record<string, string>> = { 1956: { 'Montreal Canadiens': 'Montréal Canadiens' }, 1957: { Atletico: 'Atlético Madrid', PSG: 'Paris Saint-Germain', 'Inter Milan': 'Inter Milan' }, 20639: { 'Vancouver Whitecaps FC': 'Vancouver Whitecaps FC' } };
for (const [pid, paths] of Object.entries(leagues)) {
  const rows: any[] = []; const seen = new Set<string>();
  const add = (label: string, t: any) => { if (seen.has(label.toLowerCase())) return; seen.add(label.toLowerCase()); rows.push({ label, person: label, kind: 'logo', imageSource: t.logo, authorName: 'ESPN team logo', authorUrl: t.link }); };
  const all: any[] = [];
  for (const path of paths) {
    const j: any = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/teams?limit=100`)).json().catch(() => null);
    for (const t of j?.sports?.[0]?.leagues?.[0]?.teams ?? []) { const x = t.team; if (x.logos?.[0]?.href) all.push({ name: x.displayName, loc: x.location, logo: x.logos[0].href, link: x.links?.[0]?.href ?? 'https://www.espn.com' }); }
  }
  for (const t of all) { add(t.name, t); if (t.loc && !paths[0].includes('soccer')) add(t.loc, t); }
  for (const [label, name] of Object.entries(extra[Number(pid)] ?? {})) { const t = all.find((t) => t.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ')[0])); if (t) add(label, t); }
  const r = await savePhotosPartial(Number(pid), rows);
  console.log(pid, 'saved', r.saved.length, JSON.stringify(r.failed).slice(0, 200));
}
await db.closeConnection(); process.exit(0);
