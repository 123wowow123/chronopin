import { describe, expect, it } from 'vitest';
import { lintBundle } from './okfLint';
import { sampleBag } from './bagSample';
import { buildPreference, CLICKED_BOOST, parsePersonalBag, personalWeigher, userWikiBundle, userWikiPage, type PreferenceSignal } from './userWiki';

const now = new Date('2026-09-18T12:00:00Z');
const signal = (pinId: number, kind: PreferenceSignal['kind'], category: string | null, company: string | null = null, at = now): PreferenceSignal => ({
  pinId,
  kind,
  at,
  title: `Pin ${pinId}`,
  url: `https://chronopin.test/pin/${pinId}/pin-${pinId}`,
  category,
  company,
});

describe('buildPreference', () => {
  it('shares weight by category and company, a watch counting three opens', () => {
    const pref = buildPreference([signal(1, 'open', 'Games', 'Nintendo'), signal(2, 'watch', 'Movies'), signal(3, 'open', 'games')], now);
    expect(pref.categories).toEqual([
      { name: 'Movies', share: 0.6 },
      { name: 'Games', share: 0.4 },
    ]);
    expect(pref.companies).toEqual([{ name: 'Nintendo', share: 0.2 }]);
    expect(pref.signals).toBe(3);
  });

  it('lists opened pins newest first, not watched-only ones', () => {
    const pref = buildPreference(
      [signal(1, 'open', null, null, new Date('2026-09-01T00:00:00Z')), signal(2, 'open', null), signal(3, 'watch', null), signal(1, 'open', null, null, new Date('2026-08-01T00:00:00Z'))],
      now,
    );
    expect(pref.clicked).toEqual([2, 1]);
  });

  it('lets old signals fade', () => {
    const old = new Date(+now - 120 * 86_400_000);
    const pref = buildPreference([signal(1, 'open', 'Games', null, old), signal(2, 'open', 'Movies')], now);
    expect(pref.categories[0]).toEqual({ name: 'Movies', share: 0.8 });
  });

  it('is empty with no signals', () => {
    expect(buildPreference([], now)).toEqual({ clicked: [], categories: [], companies: [], signals: 0 });
  });
});

describe('personalWeigher', () => {
  const weigh = personalWeigher({ clicked: [7], categories: [{ name: 'Games', share: 0.5 }], companies: [{ name: 'Sony', share: 0.25 }], signals: 4 });

  it('weighs opened pins, and those in a leaned-to category or company, more', () => {
    expect(weigh({ id: 1 })).toBe(1);
    expect(weigh({ id: 7 })).toBe(1 + CLICKED_BOOST);
    expect(weigh({ id: 1, category: 'games', company: 'SONY' })).toBe(2.5);
  });

  it('counts an opened duplicate for the card that stands for it', () => {
    expect(weigh({ id: 1 }, [1, 7])).toBe(1 + CLICKED_BOOST);
  });

  it('brings an opened pin into a crowded day far more often', () => {
    const pins = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const seeds = Array.from({ length: 300 }, (_, i) => `seed${i}`);
    const hits = (boost?: (p: { id: number }) => number) => seeds.filter((s) => sampleBag(pins, 4, s, null, boost).includes(7)).length;
    expect(hits(weigh)).toBeGreaterThan(hits() * 1.5);
  });
});

describe('parsePersonalBag', () => {
  it('takes { enabled } and refuses anything else', () => {
    expect(parsePersonalBag({ enabled: false })).toEqual({ setting: { enabled: false } });
    expect(parsePersonalBag({ enabled: 'yes' })).toHaveProperty('problem');
    expect(parsePersonalBag(null)).toHaveProperty('problem');
  });
});

describe('user wiki as OKF', () => {
  it('renders a bundle that passes the OKF lint', () => {
    const signals = [signal(1, 'open', 'Games', 'Nintendo'), signal(2, 'watch', 'Movies'), signal(3, 'comment', 'Games')];
    const pref = buildPreference(signals, now);
    const page = userWikiPage({ id: 5, userName: 'ian' }, pref, signals, now);
    expect(page).toContain('type: Profile');
    expect(page).toContain('# Categories');
    expect(page).toContain('[Pin 2](https://chronopin.test/pin/2/pin-2) - watch, 2026-09-18');
    const files = userWikiBundle([{ userId: 5, userName: 'ian', page, builtAt: now }]);
    expect([...files.keys()].sort()).toEqual(['index.md', 'log.md', 'users/5-ian.md', 'users/index.md']);
    expect(lintBundle(files)).toEqual([]);
  });
});
