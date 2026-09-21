// A ClinicalTrials.gov study record, read from the registry's own API.
//
// The study pages render entirely in the browser from a client-side fetch, so
// reading the HTML - plainly or in a headless browser - captures the site's
// glossary, navigation and federal footer and nothing else. Every study comes
// back as the same 3,563 characters, which is not a page that failed to load
// but a page with no record in it, and it passes every check a fetcher can
// make on shape alone. All 23 studies the timeline cites were stored that way.
//
// The registry publishes the record as JSON, keyless, so the record is taken
// from there and rendered as text for the wiki to be written from.
// https://clinicaltrials.gov/data-api/api

import type { SourceText } from './sourceText';

const API = 'https://clinicaltrials.gov/api/v2/studies';
const FETCH_TIMEOUT_MS = 20000;

// clinicaltrials.gov/study/NCT01234567, and the older /ct2/show/NCT01234567.
const NCT_ID = /\/(?:study|ct2\/show)\/(NCT\d{8})/i;

export const clinicalTrialsId = (url: string): string | undefined => url.match(NCT_ID)?.[1]?.toUpperCase();

type Module = Record<string, any>;

const list = (values: unknown): string => (Array.isArray(values) ? values.filter((v) => typeof v === 'string').join(', ') : '');

// A date the registry gives as {date, type}, where type is ACTUAL or ESTIMATED
// - a distinction the pin's own dates depend on, so it is kept in the text.
const dateOf = (struct: Module | undefined): string =>
  struct?.date ? `${struct.date}${struct.type ? ` (${String(struct.type).toLowerCase()})` : ''}` : '';

export async function fetchClinicalTrial(url: string): Promise<SourceText> {
  const id = clinicalTrialsId(url);
  if (!id) throw new Error(`Not a ClinicalTrials.gov study URL: ${url}`);

  const res = await fetch(`${API}/${id}?format=json`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.status === 404) throw new Error(`ClinicalTrials.gov has no study ${id}`);
  if (!res.ok) throw new Error(`ClinicalTrials.gov answered ${res.status} for ${id}`);

  const study = (await res.json()) as Module;
  const p: Module = study.protocolSection ?? {};
  const ident: Module = p.identificationModule ?? {};
  const status: Module = p.statusModule ?? {};
  const design: Module = p.designModule ?? {};
  const sponsor: Module = p.sponsorCollaboratorsModule ?? {};
  const description: Module = p.descriptionModule ?? {};
  const conditions: Module = p.conditionsModule ?? {};
  const arms: Module = p.armsInterventionsModule ?? {};
  const outcomes: Module = p.outcomesModule ?? {};
  const contacts: Module = p.contactsLocationsModule ?? {};

  // A label is written only when its field has a value. Printing "Sponsor: "
  // with nothing after it reads as "the registry does not name a sponsor",
  // which is a claim, and a wrong one when the truth is that this code looked
  // in the wrong place - as it did, at sponsorCollaboratorModule, while the
  // registry calls it sponsorCollaboratorsModule. A missing line is honest;
  // an empty label is not. The check below then catches a shape change.
  const field = (label: string, value: unknown) => (value === undefined || value === null || value === '' ? '' : `${label}: ${value}`);

  const lines = [
    field('Title', ident.briefTitle),
    field('Official title', ident.officialTitle),
    field('NCT number', ident.nctId ?? id),
    field('Sponsor', sponsor.leadSponsor?.name ? `${sponsor.leadSponsor.name}${sponsor.leadSponsor.class ? ` (${sponsor.leadSponsor.class})` : ''}` : ''),
    field('Collaborators', sponsor.collaborators?.length ? sponsor.collaborators.map((c: Module) => c.name).join(', ') : ''),
    field('Status', status.overallStatus),
    field('Why stopped', status.whyStopped),
    field('Study type', design.studyType),
    field('Phase', design.phases?.length ? list(design.phases) : ''),
    field(
      'Enrollment',
      design.enrollmentInfo?.count === undefined
        ? ''
        : `${design.enrollmentInfo.count}${design.enrollmentInfo.type ? ` (${String(design.enrollmentInfo.type).toLowerCase()})` : ''}`,
    ),
    field('Conditions', conditions.conditions?.length ? list(conditions.conditions) : ''),
    '',
    'Dates:',
    field('  Start', dateOf(status.startDateStruct)),
    field('  Primary completion', dateOf(status.primaryCompletionDateStruct)),
    field('  Completion', dateOf(status.completionDateStruct)),
    field('  First posted', dateOf(status.studyFirstPostDateStruct)),
    field('  Last update posted', dateOf(status.lastUpdatePostDateStruct)),
    '',
    description.briefSummary ? `Brief summary:\n${description.briefSummary}` : '',
    description.detailedDescription ? `\nDetailed description:\n${description.detailedDescription}` : '',
  ];

  if (arms.interventions?.length) {
    lines.push('', 'Interventions:');
    for (const i of arms.interventions as Module[]) {
      lines.push(`  - ${i.type ?? ''}: ${i.name ?? ''}${i.description ? ` - ${i.description}` : ''}`);
    }
  }
  if (outcomes.primaryOutcomes?.length) {
    lines.push('', 'Primary outcome measures:');
    for (const o of outcomes.primaryOutcomes as Module[]) {
      lines.push(`  - ${o.measure ?? ''}${o.timeFrame ? ` (time frame: ${o.timeFrame})` : ''}`);
    }
  }
  // Every site of a large trial is pages of addresses and adds nothing a wiki
  // needs, so this is the count and the countries only.
  if (contacts.locations?.length) {
    const countries = [...new Set((contacts.locations as Module[]).map((l) => l.country).filter(Boolean))];
    lines.push('', `Locations: ${contacts.locations.length} site(s) in ${countries.join(', ')}`);
  }

  // The registry can rename a module, as it evidently has before. If that
  // happens the record still renders - just emptier - and an emptier record
  // is the one thing this module must never hand back quietly, because the
  // whole reason it exists is that a plausible-looking near-empty page went
  // unnoticed 23 times. These four always exist on a real study record, so a
  // record missing them means the shape moved and the caller should hear so.
  const required = ['Title', 'NCT number', 'Status', 'Study type'];
  const missing = required.filter((label) => !lines.some((l) => l.startsWith(`${label}: `)));
  if (missing.length) {
    throw new Error(`ClinicalTrials.gov record for ${id} is missing ${missing.join(', ')} - the API's shape has probably changed`);
  }

  return { title: ident.briefTitle ? String(ident.briefTitle).slice(0, 1024) : `Study ${id}`, text: lines.filter((l) => l !== '').join('\n') };
}
