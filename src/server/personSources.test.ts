import { describe, expect, it } from 'vitest';
import { congressSalary, govtrackId, lawContribution, memberName, officeLabel, publicLawFrom, partyLabel, religionLabel, salaryEarnings, tenureStart } from './personSources';

describe('memberName', () => {
  it('uses the nickname a member goes by and keeps a suffix', () => {
    expect(memberName({ firstname: 'Rafael', lastname: 'Cruz', nickname: 'Ted' })).toBe('Ted Cruz');
    expect(memberName({ firstname: 'Susan', lastname: 'Collins' })).toBe('Susan Collins');
    expect(memberName({ firstname: 'Hank', lastname: 'Johnson', namemod: 'Jr.' })).toBe('Hank Johnson Jr.');
  });
});

describe('govtrackId', () => {
  it('reads the id off the member link', () => {
    expect(govtrackId('https://www.govtrack.us/congress/members/susan_collins/300025')).toBe(300025);
    expect(govtrackId('https://www.govtrack.us/congress/members/')).toBeNull();
  });
});

describe('officeLabel', () => {
  it('names a senator, a district, an at-large seat and a delegate', () => {
    expect(officeLabel({ role_type: 'senator', state: 'ME', district: null })).toBe('United States Senator from Maine');
    expect(officeLabel({ role_type: 'representative', state: 'TX', district: 3 })).toBe("United States Representative from Texas's 3rd congressional district");
    expect(officeLabel({ role_type: 'representative', state: 'TX', district: 22 })).toContain('22nd');
    expect(officeLabel({ role_type: 'representative', state: 'TX', district: 11 })).toContain('11th');
    expect(officeLabel({ role_type: 'representative', state: 'WY', district: 0 })).toBe("United States Representative from Wyoming's at-large");
    expect(officeLabel({ role_type: 'representative', state: 'DC', district: 0 })).toBe('United States Delegate from District of Columbia');
  });
});

describe('congressSalary', () => {
  it('pays the rank-and-file rate, the leadership rates and nothing before the table starts', () => {
    expect(congressSalary(2024, null)).toBe(174_000);
    expect(congressSalary(2024, 'Speaker')).toBe(223_500);
    expect(congressSalary(2024, 'Majority Leader')).toBe(193_400);
    expect(congressSalary(2024, 'Minority Leader')).toBe(193_400);
    expect(congressSalary(2024, 'Majority Whip')).toBe(174_000);
    expect(congressSalary(2008, null)).toBeNull();
  });
});

describe('salaryEarnings', () => {
  it('makes a line per year served on 1 July, from 2009, with leadership years at their rate', () => {
    const lines = salaryEarnings(
      [
        { role_type: 'senator', startdate: '2003-01-07', enddate: '2009-01-03', leadership_title: null },
        { role_type: 'senator', startdate: '2009-01-06', enddate: '2015-01-03', leadership_title: null },
        { role_type: 'senator', startdate: '2015-01-06', enddate: '2021-01-03', leadership_title: 'Majority Leader' },
      ],
      2030,
    );
    expect(lines.map((l) => l.year)).toEqual([2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009]);
    expect(lines.find((l) => l.year === 2016)?.amount).toBe(193_400);
    expect(lines.find((l) => l.year === 2012)?.amount).toBe(174_000);
    expect(lines.find((l) => l.year === 2016)?.label).toBe('Senate salary (Majority Leader)');
  });

  it('stops at the year asked for and skips a stub year', () => {
    const lines = salaryEarnings([{ role_type: 'representative', startdate: '2025-01-03', enddate: '2027-01-03', leadership_title: null }], 2025);
    expect(lines.map((l) => l.year)).toEqual([2025]);
    expect(salaryEarnings([{ role_type: 'representative', startdate: '2019-09-01', enddate: '2019-12-31', leadership_title: null }], 2025)).toEqual([]);
  });
});

describe('laws', () => {
  it('reads a public law number off a bill action', () => {
    expect(publicLawFrom('Became Public Law No: 119-118.')).toBe('Pub. L. 119-118');
    expect(publicLawFrom('Referred to the Committee on Finance.')).toBeNull();
    expect(publicLawFrom(undefined)).toBeNull();
  });

  it('turns an enacted sponsored bill into a law contribution and drops the rest', () => {
    const law = lawContribution({
      congress: 119,
      type: 'S',
      number: '2398',
      title: 'Kay Hagan Tick Reauthorization Act',
      latestAction: { actionDate: '2026-09-30', text: 'Became Public Law No: 119-118.' },
      policyArea: { name: 'Health' },
    });
    expect(law).toMatchObject({ kind: 'law', role: 'sponsor', reference: 'Pub. L. 119-118', date: '2026-09-30', origin: 'congress' });
    expect(law?.sourceUrl).toBe('https://www.congress.gov/bill/119th-congress/senate-bill/2398');
    expect(lawContribution({ congress: 119, type: 'S', number: '1', title: 'x', latestAction: { text: 'Read twice.' } })).toBeNull();
  });
});

describe('religionLabel', () => {
  it('names one faith once, keeps other labels in order, and drops unresolved ids', () => {
    expect(religionLabel(['Catholicism', 'Roman Catholic'])).toBe('Catholic');
    expect(religionLabel(['Judaism'])).toBe('Judaism');
    expect(religionLabel(['Southern Baptist Convention', 'Q12345', 'southern baptist convention'])).toBe('Southern Baptist Convention');
    expect(religionLabel(['Q1'])).toBeNull();
    expect(religionLabel(['Congregational churches', 'congregationalist polity', 'United Church of Christ', 'Protestantism'])).toBe('United Church of Christ');
    expect(religionLabel(['Protestantism'])).toBe('Protestantism');
    expect(religionLabel([])).toBeNull();
  });
});

describe('tenureStart', () => {
  it('finds where the latest unbroken run began, across a stray overlapping term', () => {
    expect(
      tenureStart([
        { start: '1981-01-03', end: '1983-01-03' },
        { start: '1981-01-03', end: '1999-01-03' },
        { start: '1983-01-03', end: '1985-01-03' },
        { start: '1999-01-03', end: '2001-01-03' },
        { start: '2001-01-03', end: null },
      ]),
    ).toBe('1981-01-03');
  });

  it('starts again after a gap longer than the allowance', () => {
    expect(
      tenureStart([
        { start: '2001-01-03', end: '2007-01-03' },
        { start: '2013-01-03', end: '2015-01-03' },
        { start: '2015-01-03', end: null },
      ]),
    ).toBe('2013-01-03');
    expect(tenureStart([])).toBeNull();
  });
});

describe('partyLabel', () => {
  it('drops the word Party and unresolved ids', () => {
    expect(partyLabel('Democratic Party')).toBe('Democratic');
    expect(partyLabel('Republican')).toBe('Republican');
    expect(partyLabel('Q12345')).toBeNull();
    expect(partyLabel(null)).toBeNull();
  });
});
