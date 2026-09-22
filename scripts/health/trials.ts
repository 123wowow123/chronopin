// The late-stage drug pipeline as pins: the date each big phase 3 trial is
// due to read out, from ClinicalTrials.gov's API v2 (free, no key).
//
// A trial's "primary completion date" is when the last participant's primary
// outcome is measured - the day the answer exists, months before any
// regulator sees it. For a trial of this size that date moves markets, which
// is why the sponsor's ticker rides along on the pin.
//
// Only industry-sponsored phase 3 trials above an enrollment floor are
// pinned, and only for sponsors in SPONSORS below, which gives each pin a
// headquarters to sit at and a ticker. A trial by anyone else is skipped
// rather than pinned without a place.
//
// The dates are the sponsors' own estimates and they slip, so every pin is
// dateConfidence "estimated" and says so.
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run health:trials
//   npm run health:trials -- --dry-run            list what would happen
//   npm run health:trials -- --min-enrollment 500 widen the net (default 2000)
//   npm run health:trials -- --from 2026-11-01 --to 2028-06-30

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { lookupStudioLocation } from '@/server/studioLocation';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'min-enrollment': { type: 'string', default: '2000' },
    from: { type: 'string', default: '2026-11-01' },
    to: { type: 'string', default: '2028-12-31' },
    limit: { type: 'string', default: '25' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

// The sponsors worth pinning: the article that gives the headquarters, and
// the US-listed ticker (an ADR counts; a private company has none).
const SPONSORS: Record<string, { wiki: string; symbol: string | null; name: string; note: string }> = {
  Amgen: { wiki: 'Amgen', symbol: 'AMGN', name: 'Amgen', note: "the California biotech behind Repatha and the MariTide obesity programme" },
  AstraZeneca: { wiki: 'AstraZeneca', symbol: 'AZN', name: 'AstraZeneca', note: "the Anglo-Swedish drugmaker with a large oncology and cardiometabolic pipeline" },
  Pfizer: { wiki: 'Pfizer', symbol: 'PFE', name: 'Pfizer', note: "the New York drugmaker behind Comirnaty and Paxlovid" },
  'Novo Nordisk A/S': { wiki: 'Novo_Nordisk', symbol: 'NVO', name: 'Novo Nordisk', note: "the Danish maker of Ozempic and Wegovy" },
  'Eli Lilly and Company': { wiki: 'Eli_Lilly_and_Company', symbol: 'LLY', name: 'Eli Lilly and Company', note: "the Indianapolis drugmaker behind Mounjaro and Zepbound" },
  'Merck Sharp & Dohme LLC': { wiki: 'Merck_%26_Co.', symbol: 'MRK', name: 'Merck & Co.', note: "the New Jersey drugmaker behind Keytruda" },
  GlaxoSmithKline: { wiki: 'GSK_plc', symbol: 'GSK', name: 'GSK', note: "the British vaccines and specialty medicines group" },
  Sanofi: { wiki: 'Sanofi', symbol: 'SNY', name: 'Sanofi', note: "the French drugmaker and vaccine maker behind Dupixent" },
  AbbVie: { wiki: 'AbbVie', symbol: 'ABBV', name: 'AbbVie', note: "the Illinois drugmaker behind Humira, Skyrizi and Rinvoq" },
  'Boehringer Ingelheim': { wiki: 'Boehringer_Ingelheim', symbol: null, name: 'Boehringer Ingelheim', note: "the family-owned German drugmaker behind Jardiance" },
  'Bristol-Myers Squibb': { wiki: 'Bristol_Myers_Squibb', symbol: 'BMY', name: 'Bristol Myers Squibb', note: "the New York drugmaker behind Eliquis and Opdivo" },
  'Johnson & Johnson': { wiki: 'Johnson_%26_Johnson', symbol: 'JNJ', name: 'Johnson & Johnson', note: "the New Jersey healthcare group behind Stelara and Darzalex" },
  'Regeneron Pharmaceuticals': { wiki: 'Regeneron_Pharmaceuticals', symbol: 'REGN', name: 'Regeneron Pharmaceuticals', note: "the New York biotech behind Eylea and Dupixent" },
  'Vertex Pharmaceuticals Incorporated': { wiki: 'Vertex_Pharmaceuticals', symbol: 'VRTX', name: 'Vertex Pharmaceuticals', note: "the Boston biotech behind Trikafta and Casgevy" },
  Novartis: { wiki: 'Novartis', symbol: 'NVS', name: 'Novartis', note: "the Swiss drugmaker behind Entresto and Kisqali" },
  'Roche Pharma AG': { wiki: 'Hoffmann-La_Roche', symbol: 'RHHBY', name: 'Roche', note: "the Swiss pharmaceuticals and diagnostics group" },
  'Hoffmann-La Roche': { wiki: 'Hoffmann-La_Roche', symbol: 'RHHBY', name: 'Roche', note: "the Swiss pharmaceuticals and diagnostics group" },
  Bayer: { wiki: 'Bayer', symbol: 'BAYRY', name: 'Bayer', note: "the German pharmaceuticals and crop science group" },
  'Gilead Sciences': { wiki: 'Gilead_Sciences', symbol: 'GILD', name: 'Gilead Sciences', note: "the California biotech behind Biktarvy and Veklury" },
  Moderna: { wiki: 'Moderna', symbol: 'MRNA', name: 'Moderna', note: "the Massachusetts mRNA vaccine maker" },
  'Takeda Pharmaceutical Company Limited': { wiki: 'Takeda_Pharmaceutical_Company', symbol: 'TAK', name: 'Takeda', note: "Japan's largest drugmaker" },
};

const API = 'https://clinicaltrials.gov/api/v2/studies';
const DAY_MS = 86_400_000;

type Study = {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle: string };
    statusModule: { primaryCompletionDateStruct?: { date: string; type?: string } };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
    conditionsModule?: { conditions?: string[] };
    designModule?: { enrollmentInfo?: { count?: number } };
    armsInterventionsModule?: { interventions?: { type?: string; name: string }[] };
    descriptionModule?: { briefSummary?: string };
  };
};

// "2028-06" is a month, "2028-06-30" a day. A month-only estimate is pinned
// on the first of that month, which the reasoning says outright.
function startOf(date: string): { iso: string; monthOnly: boolean } {
  const monthOnly = /^\d{4}-\d{2}$/.test(date);
  return { iso: new Date(`${monthOnly ? `${date}-01` : date}T00:00:00.000Z`).toISOString(), monthOnly };
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

// The trial's own drug, preferred over a comparator or a placebo arm. Asking
// the API for a field list drops each intervention's `type`, so the kind is
// not filtered on - only the arms that are plainly not the drug.
function drugOf(study: Study): string | null {
  const drugs = (study.protocolSection.armsInterventionsModule?.interventions ?? [])
    .filter((i) => !i.type || /drug|biological/i.test(i.type))
    .map((i) => i.name.trim())
    .filter((n) => n && !/placebo|standard of care|saline|comparator|matching/i.test(n));
  if (!drugs.length) return null;
  // The registry lists the experimental arm first and the comparator after
  // it, so the first name is the trial's own drug - taking the shortest
  // instead picked out tamoxifen over camizestrant. Digits are no guide
  // either, because a compound in development is all code name and digits
  // (MK-8527, REGN7508); what is skipped is a name that is really a dose
  // line ("BGF MDI 320/14.4/9.6 ug"), and only if something else is left.
  const dose = /\d\s*(mg|mcg|ug|µg|μg|ml|iu|%)\b|\bMDI\b|\d+\/\d+/i;
  const compounds = drugs.filter((n) => !dose.test(n));
  return (compounds[0] ?? drugs[0]).replace(/\s*\(.*\)$/, '').replace(/[®™]/g, '').trim();
}

// "Healthy", "Healthy Volunteers" and the like name who was enrolled, not
// what the trial is about; the next condition is the real one.
function conditionOf(conditions: string[]): string | null {
  const real = conditions.map((c) => c.replace(/\s*\(.*\)\s*$/, '').trim()).filter((c) => c && !/^healthy\b/i.test(c));
  return real[0] ?? null;
}

async function fetchStudies(): Promise<Study[]> {
  const params = new URLSearchParams({
    'filter.advanced': `AREA[Phase]PHASE3 AND AREA[PrimaryCompletionDate]RANGE[${flags.from},${flags.to}] AND AREA[LeadSponsorClass]INDUSTRY AND AREA[OverallStatus]RECRUITING`,
    fields: 'NCTId,BriefTitle,PrimaryCompletionDate,LeadSponsorName,EnrollmentCount,Condition,InterventionName,BriefSummary',
    sort: 'EnrollmentCount:desc',
    pageSize: '100',
  });
  const response = await fetch(`${API}?${params}`, { headers: { 'User-Agent': 'chronopin (trial calendar)' } });
  if (!response.ok) throw new Error(`ClinicalTrials.gov ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return ((await response.json()) as { studies: Study[] }).studies ?? [];
}

async function login(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

async function run() {
  const floor = Number(flags['min-enrollment']);
  const studies = (await fetchStudies()).filter((s) => {
    const p = s.protocolSection;
    return (
      (p.designModule?.enrollmentInfo?.count ?? 0) >= floor &&
      SPONSORS[p.sponsorCollaboratorsModule.leadSponsor.name] &&
      p.statusModule.primaryCompletionDateStruct?.date &&
      drugOf(s) &&
      conditionOf(p.conditionsModule?.conditions ?? [])
    );
  });
  console.log(`${studies.length} phase 3 trial(s) from a listed sponsor, ${floor}+ participants, reading out ${flags.from} to ${flags.to}`);

  const token = flags['dry-run'] ? '' : await login(flags.base!);
  const places = new Map<string, Awaited<ReturnType<typeof lookupStudioLocation>>>();
  let created = 0;
  let skipped = 0;

  for (const study of studies.slice(0, Number(flags.limit))) {
    const p = study.protocolSection;
    const nct = p.identificationModule.nctId;
    const sponsor = SPONSORS[p.sponsorCollaboratorsModule.leadSponsor.name];
    const sourceUrl = `https://clinicaltrials.gov/study/${nct}`;
    const [existing] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL LIMIT 1`, [sourceUrl]);
    if (existing) {
      console.log(`  = ${nct} [pin ${existing.id}]`);
      skipped++;
      continue;
    }
    const drug = titleCase(drugOf(study)!);
    const condition = conditionOf(p.conditionsModule?.conditions ?? [])!;
    const enrollment = p.designModule?.enrollmentInfo?.count ?? 0;
    const raw = p.statusModule.primaryCompletionDateStruct!.date;
    const { iso, monthOnly } = startOf(raw);

    if (!places.has(sponsor.wiki)) {
      places.set(sponsor.wiki, await lookupStudioLocation(`https://en.wikipedia.org/wiki/${sponsor.wiki}`));
      await new Promise((r) => setTimeout(r, 1200));
    }
    const place = places.get(sponsor.wiki) ?? null;

    const body = {
      title: `${drug}'s Phase 3 Trial in ${condition} Reads Out`.slice(0, 120),
      description: [
        `${sponsor.name}'s phase 3 trial of ${drug} in ${condition.toLowerCase()} reaches primary completion, the point at which the last participant's primary outcome is measured.`,
        `The trial enrolled ${enrollment.toLocaleString('en-US')} participants.`,
        (p.descriptionModule?.briefSummary ?? '').replace(/\s+/g, ' ').trim().slice(0, 900),
      ]
        .filter(Boolean)
        .join(' '),
      sourceUrl,
      address: place?.address ?? null,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
      allDay: true,
      utcStartDateTime: iso,
      utcEndDateTime: new Date(new Date(iso).getTime() + DAY_MS).toISOString(),
      dateConfidence: 'estimated',
      dateConfidenceReasoning: monthOnly
        ? `ClinicalTrials.gov gives the primary completion date only as ${raw}, an estimate by the sponsor, so the pin sits on the first of that month.`
        : `ClinicalTrials.gov lists ${raw} as the estimated primary completion date; a sponsor's estimate, and trials of this size routinely slip.`,
      company: sponsor.name,
      companyWikiUrl: `https://en.wikipedia.org/wiki/${sponsor.wiki}`,
      categories: ['Health'],
      tags: [...new Set([drug, ...(p.conditionsModule?.conditions ?? []).slice(0, 3), 'Phase 3', 'Clinical trial'])].slice(0, 8),
      // The note is kept on the company, not the pin, so it describes the
      // company in general rather than this one trial.
      stocks: sponsor.symbol ? [{ symbol: sponsor.symbol, name: sponsor.name, relation: 'company', note: sponsor.note }] : [],
      parentId: null,
    };
    console.log(`  + ${raw} ${body.title} (${sponsor.name}, ${enrollment} participants${place ? '' : ', no place'})`);
    if (flags['dry-run']) continue;
    const response = await fetch(`${flags.base}/api/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`    ${response.status}: ${(await response.text()).slice(0, 250)}`);
      continue;
    }
    created++;
    await new Promise((r) => setTimeout(r, 900));
  }
  console.log(`${created} created, ${skipped} already pinned${flags['dry-run'] ? ' (dry run)' : ''}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
