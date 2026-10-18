import { describe, expect, it } from 'vitest';
import { collapseSparsePhases, educationLevelOf, generateOverview, incomeScore, misconductAxis, OCTAGON_AXES, octagonPoints, octagonRing, phaseYears, ageOn, currentAge, impactScore, isFormer, isPolitical, misconductMeter, societyMeter, sortMatters, earningYears, formatMoney, formatMoneyRange, personPath, safeUrl, sortContributions, valueRange, type PersonContribution, type PersonEarning } from './people';

const earning = (over: Partial<PersonEarning>): PersonEarning => ({
  year: 2025, kind: 'salary', label: '', amount: 174_000, amountLow: null, amountHigh: null, currency: 'USD', sourceUrl: null, note: null, ...over,
});

describe('ageOn', () => {
  it('counts the birthday on the day itself', () => {
    expect(ageOn('1952-12-07', '2026-12-06')).toBe(73);
    expect(ageOn('1952-12-07', '2026-12-07')).toBe(74);
    expect(ageOn('2000-02-29', '2001-02-28')).toBe(0);
    expect(ageOn('2000-02-29', '2001-03-01')).toBe(1);
  });

  it('reads a Date in UTC and refuses a bad or future birth day', () => {
    expect(ageOn('1970-01-01', new Date('2026-10-10T23:59:59Z'))).toBe(56);
    expect(ageOn('2026-02-30', '2026-10-10')).toBeNull();
    expect(ageOn('2030-01-01', '2026-10-10')).toBeNull();
    expect(ageOn(null, '2026-10-10')).toBeNull();
  });
});

describe('currentAge', () => {
  it('stops at the death day', () => {
    expect(currentAge({ birthDate: '1924-10-01', deathDate: '2024-12-29' }, new Date('2026-10-10T00:00:00Z'))).toBe(100);
    expect(currentAge({ birthDate: '1924-10-01', deathDate: null }, new Date('2026-10-10T00:00:00Z'))).toBe(102);
  });
});

describe('earningYears', () => {
  it('totals each year, newest first, largest line first', () => {
    const years = earningYears([
      earning({ year: 2024 }),
      earning({ year: 2025, label: 'Senate salary' }),
      earning({ year: 2025, kind: 'royalties', label: 'Book royalties', amount: 80_000 }),
    ]);
    expect(years.map((y) => y.year)).toEqual([2025, 2024]);
    expect(years[0]).toMatchObject({ low: 254_000, high: 254_000, exact: true });
    expect(years[0].lines.map((l) => l.label)).toEqual(['Senate salary', 'Book royalties']);
  });

  it('adds a disclosure range as a range and keeps one currency to a year', () => {
    const [year] = earningYears([
      earning({ amount: 174_000 }),
      earning({ kind: 'investments', label: 'Dividends', amount: null, amountLow: 15_001, amountHigh: 50_000 }),
      earning({ kind: 'other', label: 'Euro fee', amount: 5_000, currency: 'EUR' }),
    ]);
    expect(year).toMatchObject({ currency: 'USD', low: 189_001, high: 224_000, exact: false });
    expect(year.lines).toHaveLength(2);
  });
});

describe('sortContributions', () => {
  it('lists laws first, the career-defining ones first, then newest', () => {
    const c = (over: Partial<PersonContribution>): PersonContribution => ({
      kind: 'law', title: 'x', summary: null, role: null, date: null, reference: null, importance: 3, sourceUrl: null, ...over,
    });
    const sorted = sortContributions([
      c({ kind: 'committee', title: 'Chair' }),
      c({ title: 'Old', date: '2010-01-01' }),
      c({ title: 'New', date: '2024-01-01' }),
      c({ title: 'Defining', date: '2001-01-01', importance: 1 }),
    ]);
    expect(sorted.map((s) => s.title)).toEqual(['Defining', 'New', 'Old', 'Chair']);
  });
});

describe('money', () => {
  it('prints whole dollars and compacts millions', () => {
    expect(formatMoney('en-US', 174_000, 'USD')).toBe('$174,000');
    expect(formatMoney('en-US', 2_400_000, 'USD')).toBe('$2.4M');
    expect(formatMoneyRange('en-US', 100_001, 1_000_000, 'USD')).toBe('$100,001 – $1M');
    expect(formatMoneyRange('en-US', 5, 5, 'USD')).toBe('$5');
    // Ends that compact to the same figure get more digits, not the same figure twice.
    expect(formatMoneyRange('en-US', 1_100_000_000, 1_140_000_000, 'USD')).toBe('$1.1B \u2013 $1.14B');
  });

  it('orders a value range and fills a missing end', () => {
    expect(valueRange(500, 100)).toEqual({ low: 100, high: 500 });
    expect(valueRange(null, 100)).toEqual({ low: 100, high: 100 });
    expect(valueRange(null, null)).toBeNull();
  });
});

describe('links', () => {
  it('makes the page path from the name and only trusts https links', () => {
    expect(personPath('Susan Collins')).toBe('/person/susan-collins');
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeUrl('http://example.com')).toBeNull();
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('former and political', () => {
  it('counts someone who left office or died as former', () => {
    expect(isFormer({ leftOfficeDate: '2025-01-20', deathDate: null })).toBe(true);
    expect(isFormer({ leftOfficeDate: null, deathDate: '2024-12-29' })).toBe(true);
    expect(isFormer({ leftOfficeDate: null, deathDate: null })).toBe(false);
  });

  it('treats the office roles as political and a career role as not', () => {
    expect(isPolitical('senator')).toBe(true);
    expect(isPolitical('politician')).toBe(true);
    expect(isPolitical('sports')).toBe(false);
    expect(isPolitical('other')).toBe(false);
  });
});

describe('misconductMeter', () => {
  const m = (status: Parameters<typeof misconductMeter>[0][number]['status']) => ({ status });

  it('shows nothing until someone has reviewed the record: no research is not a clean record', () => {
    expect(misconductMeter([], null)).toBeNull();
    expect(misconductMeter([m('convicted')], undefined)).toBeNull();
  });

  it('reads a reviewed record with no matter as none documented', () => {
    expect(misconductMeter([], '2026-10-10')).toMatchObject({ level: 'none', findings: 0, open: 0, resolved: 0, index: 0 });
  });

  it('counts a charge or investigation as open, not as a finding', () => {
    expect(misconductMeter([m('investigated'), m('charged')], '2026-10-10')).toMatchObject({ level: 'open', findings: 0, open: 2 });
  });

  it('counts only outcomes against the person as findings, and lists the rest as resolved', () => {
    const meter = misconductMeter([m('convicted'), m('acquitted'), m('dismissed'), m('closed-no-action'), m('overturned')], '2026-10-10');
    expect(meter).toMatchObject({ level: 'one', findings: 1, open: 0, resolved: 4 });
  });

  it('steps up with the number of findings', () => {
    const f = (n: number) => misconductMeter(Array.from({ length: n }, () => m('sanctioned')), '2026-10-10')!.level;
    expect([f(1), f(2), f(3), f(4), f(9)]).toEqual(['one', 'several', 'several', 'extensive', 'extensive']);
    expect(misconductMeter([m('settled'), m('pleaded-guilty'), m('found-liable'), m('pardoned')], '2026-10-10')!.level).toBe('extensive');
  });
});

describe('sortMatters', () => {
  it('lists the newest decision first, falling back to the filing day', () => {
    const base = { kind: 'ethics' as const, summary: null, status: 'closed-no-action' as const, authority: null, penalty: null, sourceUrl: 'https://example.com', asOf: null };
    const sorted = sortMatters([
      { ...base, title: 'Old', filedDate: '2015-01-01', resolvedDate: '2016-01-01' },
      { ...base, title: 'Open', filedDate: '2025-05-01', resolvedDate: null },
      { ...base, title: 'Mid', filedDate: '2019-01-01', resolvedDate: '2020-06-01' },
    ]);
    expect(sorted.map((x) => x.title)).toEqual(['Open', 'Mid', 'Old']);
  });
});

describe('impactScore and societyMeter', () => {
  const impact = (scores: Record<string, number>, confidence: 'high' | 'medium' | 'low' = 'high', contested = false) => ({
    scores, confidence, contested, basis: null, evidenceUrl: 'https://www.cbo.gov/x', assessedDate: null,
  });
  const c = (importance: number, i?: ReturnType<typeof impact>) => ({ importance, impact: i ?? null });

  it('averages the criteria that count toward the meter and leaves distribution out', () => {
    expect(impactScore(impact({ efficiency: 2, growth: 1, distribution: -2 }))).toBe(1.5);
    expect(impactScore(impact({ distribution: -2 }))).toBeNull();
    expect(impactScore(null)).toBeNull();
  });

  it('is nothing until enough contributions are assessed', () => {
    const four = [1, 2, 3, 4].map((n) => c(n, impact({ efficiency: 2 })));
    expect(societyMeter(four)).toBeNull();
    expect(societyMeter([c(1), c(2), c(3), c(4), c(5)])).toBeNull();
    expect(societyMeter([...four, c(5, impact({ efficiency: 2 }))])).not.toBeNull();
  });

  it('weights career-defining and well-evidenced contributions more, and reports coverage and spread', () => {
    const m = societyMeter([
      c(1, impact({ efficiency: 2 }, 'high')),
      c(5, impact({ efficiency: -2 }, 'high')),
      c(3, impact({ fiscal: 0 }, 'low', true)),
      c(4, impact({ growth: 1 }, 'high')),
      c(4, impact({ growth: -1 }, 'high')),
      c(2),
    ])!;
    expect(m.assessed).toBe(5);
    expect(m.total).toBe(6);
    expect(m.contested).toBe(1);
    expect([m.min, m.max]).toEqual([-2, 2]);
    // importance 1 weighs 5, importance 5 weighs 1, importance 4 weighs 2, importance 3 at low confidence weighs 3 x 0.3
    expect(m.value).toBeCloseTo((2 * 5 + -2 * 1 + 0 * 0.9 + 1 * 2 + -1 * 2) / (5 + 1 + 0.9 + 2 + 2), 2);
    expect(m.level).toBe('leaning-beneficial');
  });

  it('reads balanced evidence as mixed', () => {
    const m = societyMeter([1, -1, 0, 1, -1].map((v) => c(3, impact({ growth: v }))))!;
    expect(m.level).toBe('mixed');
    expect(m.value).toBe(0);
  });
});

describe('octagon', () => {
  it('has eight axes, with the three the chart is built around', () => {
    expect(OCTAGON_AXES).toHaveLength(8);
    expect(OCTAGON_AXES).toEqual(expect.arrayContaining(['misconduct', 'social', 'economic']));
    // Appearance, personality and family background cannot be scored from evidence or are not earned.
    expect(OCTAGON_AXES).not.toContain('appearance');
    expect(OCTAGON_AXES).not.toContain('personality');
    expect(OCTAGON_AXES).not.toContain('family');
  });

  it('puts the first axis straight up and a 5 on the outer ring', () => {
    const points = octagonPoints({ education: { score: 5 } }, 240, 78);
    expect(points[0]).toMatchObject({ axis: 'education', x: 120, y: 42, score: 5 });
    // The third axis points straight right: its label sits just outside the ring, and no evidence is a null score.
    expect(points[2]).toMatchObject({ axis: 'position', score: null, labelX: 212, anchor: 'start' });
  });

  it('draws an axis with no evidence as a gap, not a zero', () => {
    const points = octagonPoints({ wealth: { score: 0 } });
    expect(points.find((p) => p.axis === 'wealth')!.score).toBe(0);
    expect(points.find((p) => p.axis === 'health')!.score).toBeNull();
  });

  it('keeps a score inside the chart and the rings nested', () => {
    expect(octagonPoints({ wealth: { score: 9 } }).find((p) => p.axis === 'wealth')!.score).toBe(9);
    const outer = octagonRing(5).split(' ').map((p) => p.split(',').map(Number));
    const inner = octagonRing(1).split(' ').map((p) => p.split(',').map(Number));
    expect(outer).toHaveLength(8);
    const dist = (p: number[]) => Math.hypot(p[0] - 120, p[1] - 120);
    expect(dist(outer[0])).toBeCloseTo(78, 1);
    expect(dist(inner[0])).toBeCloseTo(15.6, 1);
  });

  it('says a phase\'s years', () => {
    expect(phaseYears({ startYear: 2017, endYear: 2021 })).toBe('2017\u20132021');
    expect(phaseYears({ startYear: 2025, endYear: null })).toBe('2025\u2013');
    expect(phaseYears({ startYear: 2001, endYear: 2001 })).toBe('2001');
    expect(phaseYears({ startYear: null, endYear: null })).toBe('');
  });
});

describe('the generated overview radar', () => {
  it('scores income against the IRS percentiles, topping out at the top 1%', () => {
    expect(incomeScore(30_000)).toEqual({ score: 1, label: 'below the median' });
    expect(incomeScore(50_339).score).toBe(1.5);
    expect(incomeScore(174_000)).toEqual({ score: 2, label: 'top 25%' });
    expect(incomeScore(178_611).score).toBe(2.5);
    expect(incomeScore(261_591).score).toBe(3);
    expect(incomeScore(663_164).score).toBe(4);
    expect(incomeScore(200_000_000).score).toBe(4);
  });

  it('reads a degree on the education scale', () => {
    expect(educationLevelOf('BA')).toBe(3);
    expect(educationLevelOf('B.S.')).toBe(3);
    expect(educationLevelOf('Bachelor of Arts')).toBe(3);
    expect(educationLevelOf('MBA')).toBe(4);
    expect(educationLevelOf('MPA')).toBe(4);
    expect(educationLevelOf('JD')).toBe(4);
    expect(educationLevelOf('Juris Doctor')).toBe(4);
    expect(educationLevelOf('Doctor of Medicine')).toBe(4);
    expect(educationLevelOf('PhD')).toBe(5);
    expect(educationLevelOf('Doctor of Philosophy')).toBe(5);
    expect(educationLevelOf('Associate of Arts')).toBe(2);
    expect(educationLevelOf('Harvard University')).toBeNull();
    expect(educationLevelOf('Mathematics')).toBeNull();
  });

  it('reads the reviewed legal record on the misconduct axis, and nothing for an unreviewed one', () => {
    const m = (...status: Parameters<typeof misconductAxis>[0][number]['status'][]) => status.map((s) => ({ status: s }));
    expect(misconductAxis(m(), null)).toBeNull();
    expect(misconductAxis(m('convicted'), null)).toBeNull();
    expect(misconductAxis(m(), '2026-10-10')).toBe(0);
    expect(misconductAxis(m('dismissed'), '2026-10-10')).toBe(1);
    expect(misconductAxis(m('charged'), '2026-10-10')).toBe(2);
    expect(misconductAxis(m('convicted'), '2026-10-10')).toBe(3);
    expect(misconductAxis(m('convicted', 'settled'), '2026-10-10')).toBe(4);
    expect(misconductAxis(m('convicted', 'settled', 'sanctioned', 'found-liable'), '2026-10-10')).toBe(5);
  });

  const base = {
    role: 'senator' as const,
    office: 'United States Senator from Maine',
    earnings: [{ year: 2026, kind: 'salary' as const, label: 'Senate salary', amount: 174_000, amountLow: null, amountHigh: null, currency: 'USD', sourceUrl: 'https://example.com/pay', note: null }],
    matters: [],
    mattersCheckedDate: null,
    wikiUrl: 'https://en.wikipedia.org/wiki/Susan_Collins',
    bioguideId: 'C001035',
    educationLevel: null,
    educationNote: null,
    educationSourceUrl: null,
  };

  it('generates what is documented, each axis with its source, and leaves the rest out', () => {
    const overview = generateOverview(base)!;
    expect(overview.origin).toBe('generated');
    expect(Object.keys(overview.axes).sort()).toEqual(['position', 'wealth']);
    expect(overview.axes.position).toMatchObject({ score: 4, evidenceUrl: 'https://bioguide.congress.gov/search/bio/C001035' });
    expect(overview.axes.wealth).toMatchObject({ score: 2, evidenceUrl: 'https://example.com/pay' });
  });

  it('adds education and a reviewed record when they are documented', () => {
    const overview = generateOverview({
      ...base,
      educationLevel: 4,
      educationNote: 'BS; JD',
      educationSourceUrl: 'https://www.wikidata.org/wiki/Q1',
      mattersCheckedDate: '2026-10-10',
      matters: [{ status: 'convicted' as const, sourceUrl: 'https://example.com/case' }] as never,
    })!;
    expect(overview.axes.education).toMatchObject({ score: 4, evidenceUrl: 'https://www.wikidata.org/wiki/Q1' });
    expect(overview.axes.misconduct).toMatchObject({ score: 3, evidenceUrl: 'https://example.com/case' });
  });

  it('is nothing for a person with nothing documented, and an income needs its source', () => {
    expect(generateOverview({ ...base, role: 'business', earnings: [], wikiUrl: null, bioguideId: null })).toBeNull();
    const noSource = generateOverview({ ...base, role: 'business', earnings: [{ ...base.earnings[0], sourceUrl: null }] });
    expect(noSource).toBeNull();
  });
});

describe('foldRoles', () => {
  it('keeps tabs of ten or more and folds the small ones into a neighbour', async () => {
    const { foldRoles } = await import('./people');
    const tab = foldRoles({ president: 11, 'vice-president': 1, cabinet: 23, senator: 100, business: 11, entertainment: 9, sports: 9, arts: 5, science: 4, other: 1 });
    expect(tab.get('senator')).toBe('senator');
    expect(tab.get('business')).toBe('business');
    expect(tab.get('president')).toBe('president');
    expect(tab.get('vice-president')).toBe('cabinet');
    for (const role of ['entertainment', 'sports', 'arts', 'science'] as const) expect(tab.get(role)).toBe('other');
    expect(tab.get('other')).toBe('other');
  });
});

describe('collapseSparsePhases', () => {
  const axis = (score: number) => ({ score, basis: null, evidenceUrl: 'https://example.com/a', confidence: 'medium' as const });
  const phase = (label: string, startYear: number, endYear: number | null, axes: Record<string, number>) => ({
    origin: 'hand' as const,
    label,
    startYear,
    endYear,
    summary: null,
    axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, axis(v)])),
  });

  it('merges phases that are all too sparse to draw a shape, the latest score per axis winning', () => {
    const merged = collapseSparsePhases([
      phase('Early', 1984, 2008, { social: 3, position: 4, education: 5 }),
      phase('Pandemic', 2020, 2022, { wealth: 2, position: 5, standing: 4, education: 5 }),
      phase('After', 2023, null, { education: 5, misconduct: 1 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].label).toBe('Overview');
    expect(merged[0].startYear).toBe(1984);
    expect(merged[0].endYear).toBeNull();
    expect(merged[0].axes.position?.score).toBe(5);
    expect(Object.keys(merged[0].axes).sort()).toEqual(['education', 'misconduct', 'position', 'social', 'standing', 'wealth']);
  });

  it('keeps the phases apart when one has enough evidence to stand alone', () => {
    const phases = [phase('First', 2017, 2021, { education: 3, wealth: 4, position: 5, standing: 2, health: 3 }), phase('Second', 2025, null, { position: 5 })];
    expect(collapseSparsePhases(phases)).toEqual(phases);
  });

  it('leaves a single phase alone', () => {
    const one = [phase('Only', 2000, null, { position: 3 })];
    expect(collapseSparsePhases(one)).toBe(one);
  });
});
