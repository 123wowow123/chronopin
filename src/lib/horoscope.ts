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

export const SUN_SIGNS: SunSign[] = SIGNS.map((s) => s.sign);

// Signs of the same element or the complementary one (Fire-Air, Earth-Water),
// the traditional rule of thumb for sun-sign compatibility.
export function compatibleSigns(sign: SunSign): SunSign[] {
  const partner = { Fire: 'Air', Air: 'Fire', Earth: 'Water', Water: 'Earth' }[sign.element];
  return SUN_SIGNS.filter((s) => s.slug !== sign.slug && (s.element === sign.element || s.element === partner));
}

const LUCKY_COLORS = ['Red', 'Orange', 'Gold', 'Green', 'Teal', 'Blue', 'Indigo', 'Violet', 'Pink', 'Silver', 'White', 'Black'];
const MOODS = ['Calm', 'Curious', 'Confident', 'Playful', 'Focused', 'Romantic', 'Restless', 'Reflective', 'Ambitious', 'Generous'];

// Lucky number, colour and mood for a sign on a day (a YYYY-MM-DD key). They are
// a fixed function of the two, so everyone with the sign sees the same, all day.
export function dailyExtras(slug: string, day: string): { luckyNumber: number; luckyColor: string; mood: string } {
  let h = 2166136261;
  for (const ch of `${slug}|${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return {
    luckyNumber: (h % 99) + 1,
    luckyColor: LUCKY_COLORS[(h >>> 8) % LUCKY_COLORS.length],
    mood: MOODS[(h >>> 16) % MOODS.length],
  };
}

// Traditional ruling planet, modality and keywords for each sign.
export const SIGN_PROFILE: Record<string, { ruler: string; modality: 'Cardinal' | 'Fixed' | 'Mutable'; traits: string }> = {
  aries: { ruler: 'Mars', modality: 'Cardinal', traits: 'Bold, direct, energetic' },
  taurus: { ruler: 'Venus', modality: 'Fixed', traits: 'Steady, sensual, patient' },
  gemini: { ruler: 'Mercury', modality: 'Mutable', traits: 'Curious, quick, talkative' },
  cancer: { ruler: 'Moon', modality: 'Cardinal', traits: 'Caring, intuitive, protective' },
  leo: { ruler: 'Sun', modality: 'Fixed', traits: 'Warm, creative, proud' },
  virgo: { ruler: 'Mercury', modality: 'Mutable', traits: 'Analytical, practical, precise' },
  libra: { ruler: 'Venus', modality: 'Cardinal', traits: 'Diplomatic, charming, fair' },
  scorpio: { ruler: 'Pluto (traditionally Mars)', modality: 'Fixed', traits: 'Intense, private, determined' },
  sagittarius: { ruler: 'Jupiter', modality: 'Mutable', traits: 'Adventurous, candid, optimistic' },
  capricorn: { ruler: 'Saturn', modality: 'Cardinal', traits: 'Disciplined, ambitious, reliable' },
  aquarius: { ruler: 'Uranus (traditionally Saturn)', modality: 'Fixed', traits: 'Independent, inventive, idealistic' },
  pisces: { ruler: 'Neptune (traditionally Jupiter)', modality: 'Mutable', traits: 'Imaginative, empathetic, dreamy' },
};
