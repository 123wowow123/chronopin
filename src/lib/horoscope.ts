// A sun sign from a birthday (a YYYY-MM-DD day key, see birthday.ts). The
// signs change on the same calendar day every year, so the month and day
// alone decide it; the few years the real cusp moves by a day are not worth
// guessing at without a birth time and place.

export type SunSign = { name: string; symbol: string; element: 'Fire' | 'Earth' | 'Air' | 'Water'; range: string; slug: string };

// Each sign starts on [month, day]; the list wraps at Capricorn.
const SIGNS: { from: [number, number]; sign: SunSign }[] = [
  { from: [1, 20], sign: { name: 'Aquarius', symbol: '♒', element: 'Air', range: 'Jan 20 – Feb 18', slug: 'aquarius' } },
  { from: [2, 19], sign: { name: 'Pisces', symbol: '♓', element: 'Water', range: 'Feb 19 – Mar 20', slug: 'pisces' } },
  { from: [3, 21], sign: { name: 'Aries', symbol: '♈', element: 'Fire', range: 'Mar 21 – Apr 19', slug: 'aries' } },
  { from: [4, 20], sign: { name: 'Taurus', symbol: '♉', element: 'Earth', range: 'Apr 20 – May 20', slug: 'taurus' } },
  { from: [5, 21], sign: { name: 'Gemini', symbol: '♊', element: 'Air', range: 'May 21 – Jun 20', slug: 'gemini' } },
  { from: [6, 21], sign: { name: 'Cancer', symbol: '♋', element: 'Water', range: 'Jun 21 – Jul 22', slug: 'cancer' } },
  { from: [7, 23], sign: { name: 'Leo', symbol: '♌', element: 'Fire', range: 'Jul 23 – Aug 22', slug: 'leo' } },
  { from: [8, 23], sign: { name: 'Virgo', symbol: '♍', element: 'Earth', range: 'Aug 23 – Sep 22', slug: 'virgo' } },
  { from: [9, 23], sign: { name: 'Libra', symbol: '♎', element: 'Air', range: 'Sep 23 – Oct 22', slug: 'libra' } },
  { from: [10, 23], sign: { name: 'Scorpio', symbol: '♏', element: 'Water', range: 'Oct 23 – Nov 21', slug: 'scorpio' } },
  { from: [11, 22], sign: { name: 'Sagittarius', symbol: '♐', element: 'Fire', range: 'Nov 22 – Dec 21', slug: 'sagittarius' } },
  { from: [12, 22], sign: { name: 'Capricorn', symbol: '♑', element: 'Earth', range: 'Dec 22 – Jan 19', slug: 'capricorn' } },
];

export function sunSign(birthday: string | null | undefined): SunSign | null {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(birthday ?? '');
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  // The last sign whose start is on or before the day; before Jan 20 it is Capricorn.
  let found = SIGNS[SIGNS.length - 1].sign;
  for (const { from, sign } of SIGNS) {
    if (month > from[0] || (month === from[0] && day >= from[1])) found = sign;
  }
  return found;
}

export const SUN_SIGN_SLUGS = SIGNS.map((s) => s.sign.slug);
