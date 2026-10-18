// The wiki under a person's page: the sourced facts of a profile
// (src/lib/people.ts) compiled into an Open Knowledge Format (v0.2)
// `Person` concept whose statements cite numbered sources, and into the
// compiled record the page renders - the same numbers, so a reader sees what
// the wiki says. Pure: the server loads the facts and the link titles
// (src/server/model/personWiki.ts).

import { frontmatter, OKF_VERSION } from './okf';
import { OCTAGON_AXES, phaseYears, earningYears, formatMoney, formatMoneyRange, impactScore, misconductMeter, personPath, safeUrl, societyMeter, sortContributions, sortMatters, valueRange, type PersonProfile } from './people';

export const PERSON_WIKI_GENERATOR = 'chronopin-person-wiki/1';
export const PERSON_WIKI_VERSION = 1;

// One numbered reference: the link, how to name it, and when it was recorded.
export type WikiReference = {
  ref: number;
  url: string;
  host: string;
  // The page's own title once its link wiki has been written; else null and
  // the reader sees the host.
  title: string | null;
  // The day the person first cited it (YYYY-MM-DD).
  recorded: string | null;
};

// The profile the page renders: its facts, the references, and `refs`, which
// maps every cited URL (as stored) to its number. `basics` are the numbers
// behind who the person is - office, party, birth and tenure.
export type CompiledPerson = PersonProfile & {
  references: WikiReference[];
  refs: Record<string, number>;
  basics: number[];
  wikiVersion: number;
  builtAt: string;
};

export function bioguideUrl(id: string | null | undefined): string | null {
  return id && /^[A-Z]\d{6}$/.test(id) ? `https://bioguide.congress.gov/search/bio/${id}` : null;
}

// The URL the way two spellings of one link compare equal: no fragment, no
// trailing slash, host lowercased and without www.
export function urlIdentity(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Every link the profile cites, in the order the page first cites it: who
// they are, then politics, religion, weight and health, then earnings (newest
// year first), contributions, property and trips. Only https links.
export function citedUrls(profile: PersonProfile): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined) => {
    const safe = safeUrl(url);
    if (!safe) return;
    const identity = urlIdentity(safe);
    if (seen.has(identity)) return;
    seen.add(identity);
    out.push(safe);
  };
  add(bioguideUrl(profile.bioguideId));
  add(profile.wikiUrl);
  add(profile.politicsSourceUrl);
  add(profile.religionSourceUrl);
  add(profile.weightSourceUrl);
  add(profile.healthSourceUrl);
  for (const year of earningYears(profile.earnings)) for (const line of year.lines) add(line.sourceUrl);
  for (const c of sortContributions(profile.contributions)) {
    add(c.sourceUrl);
    add(c.impact?.evidenceUrl);
  }
  for (const p of profile.properties) add(p.sourceUrl);
  for (const t of profile.trips) add(t.sourceUrl);
  for (const m of sortMatters(profile.matters)) add(m.sourceUrl);
  for (const ph of profile.phases) for (const a of Object.values(ph.axes)) add(a?.evidenceUrl);
  return out;
}

// numbered: the cited links in order, with what the server knows of each.
export function compile(
  profile: PersonProfile,
  known: Map<string, { title: string | null; recorded: string | null }> = new Map(),
  now: Date = new Date(),
): CompiledPerson {
  const urls = citedUrls(profile);
  const references: WikiReference[] = urls.map((url, i) => ({
    ref: i + 1,
    url,
    host: hostOf(url),
    title: known.get(urlIdentity(url))?.title ?? null,
    recorded: known.get(urlIdentity(url))?.recorded ?? null,
  }));
  const byIdentity = new Map(references.map((r) => [urlIdentity(r.url), r.ref]));
  // Every spelling of a cited URL the facts carry points at its number.
  const refs: Record<string, number> = {};
  const note = (url: string | null | undefined) => {
    const safe = safeUrl(url);
    const ref = safe ? byIdentity.get(urlIdentity(safe)) : undefined;
    if (safe && ref) refs[safe] = ref;
  };
  [profile.wikiUrl, profile.politicsSourceUrl, profile.religionSourceUrl, profile.weightSourceUrl, profile.healthSourceUrl].forEach(note);
  profile.earnings.forEach((e) => note(e.sourceUrl));
  profile.contributions.forEach((c) => {
    note(c.sourceUrl);
    note(c.impact?.evidenceUrl);
  });
  profile.properties.forEach((p) => note(p.sourceUrl));
  profile.trips.forEach((t) => note(t.sourceUrl));
  profile.matters.forEach((m) => note(m.sourceUrl));
  profile.phases.forEach((ph) => Object.values(ph.axes).forEach((a) => note(a?.evidenceUrl)));
  const basics = [bioguideUrl(profile.bioguideId), profile.wikiUrl]
    .map((u) => (safeUrl(u) ? byIdentity.get(urlIdentity(u!)) : undefined))
    .filter((n): n is number => n != null);
  return { ...profile, references, refs, basics, wikiVersion: PERSON_WIKI_VERSION, builtAt: now.toISOString() };
}

const day = (iso: string) => iso;
const cite = (...refs: (number | undefined)[]) => [...new Set(refs.filter((n): n is number => n != null))].sort((a, b) => a - b).map((n) => `[^s${n}]`).join('');

// The OKF concept for the person. `origin` is the site's address, for the
// concept's resource link.
export function personWikiPage(p: CompiledPerson, origin = 'https://www.chronopin.com'): string {
  const ref = (url: string | null | undefined) => (url ? p.refs[url] : undefined);
  const basics = cite(...p.basics);
  const lines: string[] = [];

  const who = [p.office, p.party].filter(Boolean).join(', ');
  lines.push(`# ${p.name}`, '', `${who ? `${who}.` : `${p.name}.`}${basics}${p.description ? ` ${p.description}` : ''}`);

  const facts: string[] = [];
  if (p.birthDate) facts.push(`- Born: ${day(p.birthDate)}${basics}`);
  if (p.leftOfficeDate) facts.push(`- Left office: ${day(p.leftOfficeDate)}${basics}`);
  if (p.deathDate) facts.push(`- Died: ${day(p.deathDate)}${basics}`);
  if (p.inOfficeSince) facts.push(`- In office since: ${day(p.inOfficeSince)}${basics}`);
  if (p.politics) facts.push(`- Politics: ${p.politics}${cite(ref(p.politicsSourceUrl))}`);
  if (p.religion) facts.push(`- Religion: ${p.religion}${cite(ref(p.religionSourceUrl))}`);
  if (p.weightKg != null) facts.push(`- Weight: ${p.weightKg} kg${p.weightAsOf ? ` (as of ${day(p.weightAsOf)})` : ''}${cite(ref(p.weightSourceUrl))}`);
  if (p.health) facts.push(`- Health: ${p.health}${p.healthAsOf ? ` (as of ${day(p.healthAsOf)})` : ''}${cite(ref(p.healthSourceUrl))}`);
  if (facts.length) lines.push('', '## Facts', '', ...facts);

  const years = earningYears(p.earnings);
  if (years.length) {
    lines.push('', '## Earnings by year', '', '| Year | Total | Made of |', '| --- | --- | --- |');
    for (const y of years) {
      const total = y.exact ? formatMoney('en-US', y.high, y.currency) : formatMoneyRange('en-US', y.low, y.high, y.currency);
      const parts = y.lines.map((l) => {
        const amount = l.amount != null ? formatMoney('en-US', l.amount, l.currency) : formatMoneyRange('en-US', l.amountLow!, l.amountHigh!, l.currency);
        return `${l.label || l.kind}: ${amount}${cite(ref(l.sourceUrl))}`;
      });
      lines.push(`| ${y.year} | ${total} | ${parts.join('; ').replace(/\|/g, '/')} |`);
    }
  }

  const contributions = sortContributions(p.contributions);
  if (contributions.length) {
    lines.push('', '## Laws and contributions', '');
    const society = societyMeter(p.contributions);
    if (society) {
      lines.push(
        `Good-for-society meter: ${society.level} (${society.value >= 0 ? '+' : ''}${society.value} on a -2..+2 scale, range ${society.min} to ${society.max}), from ${society.assessed} of ${society.total} contributions assessed${society.contested ? `, ${society.contested} contested` : ''}. It weighs documented effects on efficiency, market failures, growth, fiscal sustainability and distortion, from the cited evidence; it does not weigh distribution or judge intent or character.`,
        '',
      );
    }
    for (const c of contributions) {
      const meta = [c.kind, c.reference, c.role, c.date].filter(Boolean).join(', ');
      const score = impactScore(c.impact);
      const impact = c.impact && score != null
        ? ` Assessed impact ${score >= 0 ? '+' : ''}${score.toFixed(1)} on a -2..+2 scale (${c.impact.confidence} confidence${c.impact.contested ? ', contested' : ''})${cite(ref(c.impact.evidenceUrl))}${c.impact.basis ? `: ${c.impact.basis}` : '.'}`
        : '';
      lines.push(`- **${c.title}** (${meta})${cite(ref(c.sourceUrl))}${c.summary ? ` ${c.summary}` : ''}${impact}`);
    }
  }

  if (p.properties.length) {
    lines.push('', '## Property', '');
    for (const prop of p.properties) {
      const v = valueRange(prop.valueLow, prop.valueHigh);
      const value = v ? `, valued ${formatMoneyRange('en-US', v.low, v.high, prop.currency)}${prop.asOf ? ` as of ${day(prop.asOf)}` : ''}` : '';
      lines.push(`- ${prop.name} (${[prop.kind, prop.location].filter(Boolean).join(', ')})${value}${cite(ref(prop.sourceUrl))}${prop.note ? ` ${prop.note}` : ''}`);
    }
  }

  if (p.trips.length) {
    lines.push('', '## Trips', '');
    for (const t of p.trips) {
      lines.push(`- ${t.destination} (${t.kind}), ${day(t.startDate)}${t.endDate && t.endDate !== t.startDate ? ` to ${day(t.endDate)}` : ''}${cite(ref(t.sourceUrl))}${t.note ? ` ${t.note}` : ''}`);
    }
  }

  // The legal and ethics record, only once someone has reviewed it: a
  // missing review is not a clean record, so there is no section until then.
  const meter = misconductMeter(p.matters, p.mattersCheckedDate);
  if (meter) {
    lines.push('', '## Legal and ethics record', '');
    lines.push(
      `Reviewed ${meter.checked}: ${p.matters.length ? `${meter.findings} finding(s), penalty or settlement; ${meter.open} open; ${meter.resolved} resolved in the person's favour.` : 'no matter documented by a court, regulator or ethics body.'} A charge or investigation is not a finding.`,
    );
    for (const m of sortMatters(p.matters)) {
      const when = [m.filedDate ? `filed ${m.filedDate}` : null, m.resolvedDate ? `decided ${m.resolvedDate}` : null].filter(Boolean).join(', ');
      lines.push(`- **${m.title}** (${m.kind}; ${m.status}${m.authority ? `; ${m.authority}` : ''}${when ? `; ${when}` : ''})${cite(ref(m.sourceUrl))}${m.penalty ? ` Penalty: ${m.penalty}.` : ''}${m.summary ? ` ${m.summary}` : ''}`);
    }
  }

  // Life phases: each axis scored 0..5 against its rubric, with the evidence.
  if (p.phases.length) {
    lines.push('', '## Life phases', '', 'Each axis is scored 0 to 5 against a written rubric from documented evidence; an axis with no evidence is left out. There is no total: it is a profile, not a ranking.');
    for (const ph of p.phases) {
      const years = phaseYears(ph);
      lines.push('', `### ${ph.label}${years ? ` (${years})` : ''}`, '');
      if (ph.summary) lines.push(ph.summary, '');
      for (const axis of OCTAGON_AXES) {
        const a = ph.axes[axis];
        if (a) lines.push(`- ${axis}: ${a.score}/5 (${a.confidence} confidence)${cite(ref(a.evidenceUrl))}${a.basis ? ` ${a.basis}` : ''}`);
      }
    }
  }

  // How far each topic was researched, so an empty section is not read as
  // "nothing there". Not a source of facts.
  const notes = p.researchNotes ?? [];
  if (notes.length) {
    const coverage: Record<string, string> = { searched: 'searched', partial: 'partly searched (sources were blocked or the search ran short)', 'not-found': 'nothing documented' };
    lines.push('', '## Research notes', '', 'What was looked for and what came of it. These are not facts about the person; a fact stands only with its own cited source.');
    for (const n of notes) {
      lines.push('', `- **${n.topic}** (${coverage[n.coverage] ?? n.coverage}, checked ${n.checkedDate}): ${n.note.replace(/\s+/g, ' ').trim()}`);
      for (const u of n.unciteable) lines.push(`  - Looked at, not citable${u.why ? ` (${u.why})` : ''}: ${u.url}`);
    }
  }

  if (p.references.length) {
    lines.push('', '## Sources', '');
    for (const r of p.references) lines.push(`[^s${r.ref}]: ${r.title ?? r.host}. ${r.url}`);
  }

  const tags = ['person', p.role, p.party?.toLowerCase()].filter((t): t is string => !!t);
  const head = frontmatter({
    type: 'Person',
    title: p.name,
    description: [p.office, p.party, p.birthDate ? `born ${p.birthDate}` : null].filter(Boolean).join('; ') || p.name,
    resource: `${origin}${personPath(p.name)}`,
    tags,
    sources: p.references.map((r) => ({ id: `s${r.ref}`, resource: r.url, title: r.title ?? r.host })),
    generated: { by: PERSON_WIKI_GENERATOR, at: new Date(p.builtAt) },
  });
  return `${head}\n\n${lines.join('\n')}\n`;
}

export const personWikiPath = (p: { slug: string }) => `people/${p.slug}.md`;

// People's pages as a bundle: index.md, people/index.md, log.md.
export function personWikiBundle(pages: { slug: string; name: string; role: string; page: string; builtAt: Date | string }[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const p of pages) files.set(personWikiPath(p), p.page);
  files.set('people/index.md', `# People\n\n${pages.map((p) => `* [${p.name}](${p.slug}.md) - ${p.role}`).join('\n')}\n`);
  files.set('index.md', `${frontmatter({ okf_version: OKF_VERSION })}\n\n# Chronopin people\n\n* [People](people/) - ${pages.length} sourced profile(s), each a wiki whose statements cite numbered sources\n`);
  const days = new Map<string, string[]>();
  for (const p of [...pages].sort((a, b) => +new Date(b.builtAt) - +new Date(a.builtAt))) {
    const d = new Date(p.builtAt).toISOString().slice(0, 10);
    days.set(d, [...(days.get(d) ?? []), `* **Update**: Rebuilt [${p.name}](/${personWikiPath(p)})`]);
  }
  files.set('log.md', `# Update Log\n${[...days].map(([d, l]) => `\n## ${d}\n${l.join('\n')}`).join('\n')}\n`);
  return files;
}
