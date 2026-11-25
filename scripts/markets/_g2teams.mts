import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
import { readFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad';
const gaps = [...JSON.parse(readFileSync(S + '/gaps_logo.json', 'utf8')), ...JSON.parse(readFileSync(S + '/gaps_cover.json', 'utf8'))];
const leagues: Record<number, string[]> = {
  1954: ['football/nfl'], 1955: ['basketball/nba'], 1956: ['hockey/nhl'],
  1957: ['soccer/UEFA.CHAMPIONS', 'soccer/eng.1', 'soccer/esp.1', 'soccer/ita.1', 'soccer/ger.1', 'soccer/fra.1'], 19332: ['soccer/eng.1'], 20639: ['soccer/usa.1'],
};
const alias: Record<string, string> = { 'vancouver whitecaps fc': 'vancouver whitecaps', 'montreal canadiens': 'montreal canadiens', 'montréal canadiens': 'montreal canadiens', atletico: 'atletico madrid', psg: 'paris saint-germain', atletico: 'atlético madrid', 'atletico madrid': 'atlético madrid', 'montreal canadiens': 'montréal canadiens', 'los angeles r': 'los angeles rams', 'los angeles l': 'los angeles lakers', 'inter milan': 'internazionale', 'bayern munich': 'bayern munich', 'man city': 'manchester city', 'manchester united': 'manchester united' };
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.']/g, '').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (const [pid, paths] of Object.entries(leagues)) {
  const pinId = Number(pid);
  const teams: { name: string; loc: string; nick: string; logo: string; link: string }[] = [];
  for (const path of paths) {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/teams?limit=100`);
    const j: any = await r.json().catch(() => null);
    for (const t of j?.sports?.[0]?.leagues?.[0]?.teams ?? []) { const x = t.team; const logo = x.logos?.[0]?.href; if (logo) teams.push({ name: norm(x.displayName), loc: norm(x.location ?? ''), nick: norm(x.name ?? ''), logo, link: x.links?.[0]?.href ?? 'https://www.espn.com' }); }
  }
  const labels = [...new Set<string>(gaps.filter((g: any) => g.pinId === pinId).flatMap((g: any) => g.missing.map((m: any) => m.label)))];
  const rows: any[] = [];
  for (const label of labels) {
    let k = norm(label); k = alias[k] ?? k;
    const t = teams.find((t) => t.name === k) ?? teams.find((t) => t.loc === k) ?? teams.find((t) => t.name.startsWith(k) || t.name.includes(k));
    if (!t) { console.log(pinId, 'NO MATCH', label); continue; }
    rows.push({ label, person: t.name === norm(label) ? label : label, kind: 'logo', imageSource: t.logo, authorName: 'ESPN team logo', authorUrl: t.link });
  }
  const r = await savePhotosPartial(pinId, rows);
  console.log(pinId, 'saved', r.saved.length, 'failed', JSON.stringify(r.failed));
}
await db.closeConnection(); process.exit(0);
