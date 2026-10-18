import { afterEach, describe, expect, it, vi } from 'vitest';
import { clinicalTrialsId, fetchClinicalTrial } from './clinicalTrials';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clinicalTrialsId', () => {
  it('reads the NCT number off a study URL', () => {
    expect(clinicalTrialsId('https://clinicaltrials.gov/study/NCT07805707')).toBe('NCT07805707');
    // The registry's older URL shape, still cited by plenty of articles.
    expect(clinicalTrialsId('https://clinicaltrials.gov/ct2/show/NCT01234567?term=x')).toBe('NCT01234567');
    expect(clinicalTrialsId('https://example.com/study/NCT07805707')).toBe('NCT07805707');
  });
  it('leaves other links alone', () => {
    expect(clinicalTrialsId('https://clinicaltrials.gov/')).toBeUndefined();
    expect(clinicalTrialsId('https://www.bbc.co.uk/news/an-article')).toBeUndefined();
  });
});

describe('fetchClinicalTrial', () => {
  const study = {
    protocolSection: {
      identificationModule: { nctId: 'NCT07805707', briefTitle: 'A Study on an Influenza Vaccine', officialTitle: 'A Phase 3 Randomized Study' },
      statusModule: {
        overallStatus: 'RECRUITING',
        startDateStruct: { date: '2026-09-02', type: 'ACTUAL' },
        primaryCompletionDateStruct: { date: '2027-06-30', type: 'ESTIMATED' },
      },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'GlaxoSmithKline', class: 'INDUSTRY' } },
      designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE3'], enrollmentInfo: { count: 21000, type: 'ESTIMATED' } },
      descriptionModule: { briefSummary: 'The purpose is to evaluate efficacy.' },
      conditionsModule: { conditions: ['Influenza'] },
      contactsLocationsModule: { locations: [{ country: 'United States' }, { country: 'United States' }, { country: 'Japan' }] },
    },
  };

  it('renders the record as text, keeping whether a date is actual or estimated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(study)) as Response);
    const got = await fetchClinicalTrial('https://clinicaltrials.gov/study/NCT07805707');
    expect(got.title).toBe('A Study on an Influenza Vaccine');
    expect(got.text).toContain('Sponsor: GlaxoSmithKline (INDUSTRY)');
    expect(got.text).toContain('Phase: PHASE3');
    expect(got.text).toContain('Enrollment: 21000 (estimated)');
    // The pin's own dates hang on this distinction.
    expect(got.text).toContain('Start: 2026-09-02 (actual)');
    expect(got.text).toContain('Primary completion: 2027-06-30 (estimated)');
    // Sites are summarised, never listed one by one.
    expect(got.text).toContain('Locations: 3 site(s) in United States, Japan');
  });

  // The module was first read as sponsorCollaboratorModule, which the registry
  // does not have, so every record rendered "Sponsor: " with nothing after it
  // and nothing complained.
  it('leaves a label out rather than writing it empty', async () => {
    const noSponsor = { protocolSection: { ...study.protocolSection, sponsorCollaboratorsModule: undefined } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(noSponsor)) as Response);
    const got = await fetchClinicalTrial('https://clinicaltrials.gov/study/NCT07805707');
    expect(got.text).not.toContain('Sponsor:');
  });

  // A renamed module would otherwise render a thin but plausible record, which
  // is exactly the failure this whole module exists to undo.
  it('throws when the record comes back without its core fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ protocolSection: { somethingElseModule: {} } })) as Response);
    await expect(fetchClinicalTrial('https://clinicaltrials.gov/study/NCT07805707')).rejects.toThrow(/shape has probably changed/);
  });

  it('says so when the registry has no such study', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }) as Response);
    await expect(fetchClinicalTrial('https://clinicaltrials.gov/study/NCT00000000')).rejects.toThrow(/no study NCT00000000/);
  });

  it('refuses a link that is not a study', async () => {
    await expect(fetchClinicalTrial('https://clinicaltrials.gov/search')).rejects.toThrow(/Not a ClinicalTrials.gov study URL/);
  });
});
