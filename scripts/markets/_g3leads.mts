import { writeFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad';
// pin -> label -> kind, Wikipedia title
const plan: Record<number, { kind: 'logo' | 'cover'; t: Record<string, string> }> = {
  1989: { kind: 'logo', t: { Gemini: 'Gemini (language model)', Claude: 'Claude (language model)', ChatGPT: 'ChatGPT', Kimi: 'Kimi (chatbot)', Grok: 'Grok (chatbot)', Qwen: 'Qwen', Ernie: 'Ernie Bot' } },
  1977: { kind: 'logo', t: { AfD: 'Alternative for Germany', 'CDU/CSU': 'CDU/CSU', SPD: 'Social Democratic Party of Germany', Greens: 'Alliance 90/The Greens', 'The Left': 'The Left (Germany)', FDP: 'Free Democratic Party (Germany)', BSW: 'Sahra Wagenknecht Alliance' } },
  1979: { kind: 'logo', t: { 'Liberal Party': 'Liberal Party of Canada', 'Conservative Party': 'Conservative Party of Canada', 'New Democratic Party': 'New Democratic Party' } },
  20769: { kind: 'logo', t: { 'National Party': 'New Zealand National Party', 'Labour Party': 'New Zealand Labour Party', 'Green Party': 'Green Party of Aotearoa New Zealand', 'ACT New Zealand': 'ACT New Zealand', 'New Zealand First Party': 'New Zealand First', 'Te Pāti Māori': 'Te Pāti Māori' } },
  2357: { kind: 'logo', t: { Morena: 'Morena (political party)', PAN: 'National Action Party (Mexico)', PRI: 'Institutional Revolutionary Party', MC: "Citizens' Movement (Mexico)", PT: 'Labor Party (Mexico)', PVEM: 'Ecologist Green Party of Mexico' } },
  21237: { kind: 'logo', t: { 'Liberal–National': 'Liberal Party of Australia', Labor: 'Australian Labor Party', 'One Nation': "Pauline Hanson's One Nation", Greens: 'Australian Greens' } },
  20116: { kind: 'logo', t: { 'Goldman Sachs': 'Goldman Sachs', 'Bank of America': 'Bank of America', Citigroup: 'Citigroup', 'JPMorgan Chase': 'JPMorgan Chase', 'Morgan Stanley': 'Morgan Stanley' } },
  1949: { kind: 'cover', t: { 'The Odyssey': 'The Odyssey (film)', 'Dune: Part Three': 'Dune: Part Three', 'Project Hail Mary': 'Project Hail Mary (film)', 'Disclosure Day': 'Disclosure Day' } },
  1964: { kind: 'cover', t: { 'Spider-Man: Brand New Day': 'Spider-Man: Brand New Day', 'Avengers: Doomsday': 'Avengers: Doomsday', 'Wicked: For Good': 'Wicked: For Good', 'Wuthering Heights': 'Wuthering Heights (2026 film)', Michael: 'Michael (2026 film)', 'Star Wars: The Mandalorian and Grogu': 'The Mandalorian and Grogu', 'The Odyssey': 'The Odyssey (film)', 'The Hunger Games: Sunrise on the Reaping': 'The Hunger Games: Sunrise on the Reaping' } },
  1961: { kind: 'cover', t: { 'GTA VI': 'Grand Theft Auto VI', 'Resident Evil Requiem': 'Resident Evil Requiem', 'Control Resonant': 'Control Resonant', 'Phantom Blade Zero': 'Phantom Blade Zero' } },
};
const titles = [...new Set(Object.values(plan).flatMap((p) => Object.values(p.t)))];
const out: Record<string, { page: string; url: string; image: string | null }> = {};
for (let i = 0; i < titles.length; i += 20) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', titles: titles.slice(i, i + 20).join('|'), prop: 'pageimages|info', piprop: 'original', inprop: 'url', redirects: '1', format: 'json' }).toString();
  const j: any = await (await fetch(url, { headers: { 'User-Agent': 'chronopin-image-fetch/1.0' } })).json();
  const redirects = Object.fromEntries([...(j.query.normalized ?? []), ...(j.query.redirects ?? [])].map((r: any) => [r.from, r.to]));
  const pages = new Map<string, any>(Object.values<any>(j.query.pages).map((p) => [p.title, p]));
  for (const t of titles.slice(i, i + 20)) { let k = t; k = redirects[k] ?? k; k = redirects[k] ?? k; const p = pages.get(k); out[t] = { page: p?.title, url: p?.fullurl, image: p?.original?.source ?? null }; }
  await new Promise((r) => setTimeout(r, 2000));
}
writeFileSync(S + '/g3.json', JSON.stringify({ plan, out }, null, 1));
for (const t of titles) console.log(t, '->', out[t].page, out[t].image ? out[t].image.split('/').pop() : 'NO IMAGE');
