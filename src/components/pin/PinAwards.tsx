import type { PinAwardJson } from '@/lib/awards';

type Group = { body: string; year: number; work: string; sourceUrl: string; awards: string[] };

// Awards by body, year and work: "Crunchyroll Anime Awards 2021: Anime of the
// Year, Best Animation".
function group(awards: PinAwardJson[]): Group[] {
  const groups = new Map<string, Group>();
  for (const a of awards) {
    const key = `${a.body}|${a.year}|${a.work}`;
    const g = groups.get(key) ?? { body: a.body, year: a.year, work: a.work, sourceUrl: a.sourceUrl, awards: [] };
    if (!g.awards.includes(a.award)) g.awards.push(a.award);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || a.body.localeCompare(b.body));
}

// The work is always named: a pin about a later season or a film matches the
// series' awards too ("Jujutsu Kaisen Season 2" shows what Jujutsu Kaisen
// won in 2021), and it must not read as the pin's own.
function Line({ g, won }: { g: Group; won: boolean }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden>{won ? '🏆' : '🎗️'}</span>
      <span>
        <a href={g.sourceUrl} target="_blank" rel="noopener" className="font-medium text-ink hover:text-link hover:no-underline">
          {g.body} {g.year}
        </a>
        <span className="text-subtle">: {g.awards.join(', ')}</span>
        <span className="text-subtle"> (for <i>{g.work}</i>)</span>
      </span>
    </li>
  );
}

// What the work won or was nominated for, cross-checked against the award
// bodies' own pages (Crunchyroll Anime Awards, Tokyo Anime Award Festival,
// Japan Academy Film Prize). Wins are listed; nominations fold away.
export function PinAwards({ awards }: { awards?: PinAwardJson[] }) {
  if (!awards?.length) return null;
  const won = group(awards.filter((a) => a.result === 'won'));
  const nominated = group(awards.filter((a) => a.result === 'nominated'));
  const nominations = awards.length - awards.filter((a) => a.result === 'won').length;
  return (
    <section aria-labelledby="awards-heading" className="mb-4 text-sm">
      <h2 id="awards-heading" className="mb-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        Awards
      </h2>
      {won.length ? (
        <ul className="flex flex-col gap-1">
          {won.map((g) => (
            <Line key={`${g.body}|${g.year}|${g.work}`} g={g} won />
          ))}
        </ul>
      ) : null}
      {nominated.length ? (
        <details className={won.length ? 'mt-1.5' : ''}>
          <summary className="cursor-pointer text-subtle hover:text-ink">
            {won.length ? 'Also nominated' : 'Nominated'}: {nominations} {nominations === 1 ? 'nomination' : 'nominations'}
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {nominated.map((g) => (
              <Line key={`${g.body}|${g.year}|${g.work}`} g={g} won={false} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
