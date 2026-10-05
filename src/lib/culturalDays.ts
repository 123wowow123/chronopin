// The major holidays of the world's cultures, as the timeline's date tags show
// them ("Mid-Autumn Festival"), each with the foods and customs people keep
// that day ("Mooncakes", "Lantern lighting") and what Amazon sells for it.
// Pure data and date arithmetic; the dates themselves are worked out per year
// in src/server/culturalDays.ts (lunar, Islamic and Hebrew holidays move).
//
// The same catalog drives the ads (src/server/model/holidayAd.ts): a holiday's
// products run from WINDOW_BEFORE_DAYS before it to WINDOW_AFTER_DAYS after.

// A holiday's tag on a date, in the page's language: `name` is the English
// name the tag searches for, `label` how the page's language says it.
export type CulturalTradition = { name: string; label: string };
export type CulturalDay = {
  id: string;
  name: string;
  label: string;
  // Which day of the holiday this is, from 1 (a holiday of several days
  // is tagged on each of them).
  day: number;
  traditions: CulturalTradition[];
};

// Owner, 2026-10-03: the ads "keep running 1 month before hand and 3 weeks afterwards".
export const WINDOW_BEFORE_DAYS = 30;
export const WINDOW_AFTER_DAYS = 21;

export type HolidayRule =
  // The date-holidays package's own English name for it in a country (the
  // package knows the lunar, Islamic and Hebrew calendars).
  | { country: string; name: string }
  // The same month and day every year ("10-31").
  | { fixed: string }
  // The same day as another catalog holiday (Chuseok falls with Mid-Autumn).
  | { sameAs: string }
  // Easter Sunday plus this many days.
  | { easter: number };

export type HolidayDef = {
  id: string;
  name: string;
  // The culture(s) that keep it, for the title tooltip.
  culture: string;
  rule: HolidayRule;
  // Other titles the DateTime markers (the "DateTime" table) call it by; a
  // marker so titled is this holiday's, and gives way to its tag.
  aliases?: string[];
  // How many days it lasts from its date; 1 when left out.
  span?: number;
  // What people eat, make and do (in English; each is a tag).
  traditions: string[];
  // What to advertise: Amazon searches that turn up its traditional goods, and
  // the dollar prices that split what they find into inexpensive (under the
  // first), middle and expensive (from the second).
  shop?: { queries: string[]; budget: [number, number]; keywords?: string[] };
};

export const HOLIDAYS: HolidayDef[] = [
  {
    id: 'lunar-new-year',
    name: 'Lunar New Year',
    culture: 'Chinese',
    rule: { country: 'TW', name: 'Chinese New Year' },
    traditions: ['Red envelopes', 'Reunion dinner', 'Dumplings', 'Nian gao'],
    shop: { queries: ['red envelopes lunar new year', 'chinese new year candy gift box', 'lunar new year decorations'], budget: [15, 35], keywords: ['lunar new year', 'chinese new year', 'red envelope', 'hongbao', 'nian gao', 'spring festival'] },
  },
  {
    id: 'lantern-festival',
    name: 'Lantern Festival',
    culture: 'Chinese',
    rule: { country: 'TW', name: 'Lantern Festival' },
    traditions: ['Lantern lighting', 'Tangyuan', 'Riddle guessing'],
    shop: { queries: ['chinese paper lanterns festival', 'tangyuan black sesame rice balls', 'led lanterns hanging festival'], budget: [15, 35], keywords: ['lantern', 'tangyuan', 'yuanxiao', 'glutinous'] },
  },
  {
    id: 'qingming',
    name: 'Qingming Festival',
    culture: 'Chinese',
    rule: { country: 'CN', name: 'Qingming Festival' },
    traditions: ['Tomb sweeping', 'Qingtuan', 'Kite flying'],
  },
  {
    id: 'dragon-boat',
    name: 'Dragon Boat Festival',
    culture: 'Chinese',
    rule: { country: 'CN', name: 'Dragon Boat Festival' },
    traditions: ['Zongzi', 'Dragon boat racing', 'Realgar wine'],
    shop: { queries: ['zongzi sticky rice dumplings', 'zongzi bamboo leaves', 'dragon boat festival gift'], budget: [20, 45], keywords: ['zongzi', 'dragon boat', 'bamboo leaves', 'sticky rice dumpling'] },
  },
  {
    id: 'qixi',
    name: 'Qixi Festival',
    culture: 'Chinese',
    rule: { country: 'TW', name: 'Qixi Festival' },
    traditions: ['Qiaoguo pastries', 'Star gazing'],
  },
  {
    id: 'mid-autumn',
    name: 'Mid-Autumn Festival',
    culture: 'Chinese, Vietnamese',
    rule: { country: 'CN', name: 'Mid-Autumn Festival' },
    traditions: ['Mooncakes', 'Lantern lighting', 'Moon gazing', 'Pomelo'],
    shop: { queries: ['mooncake', 'mooncake gift box', 'mooncake mold', 'mid-autumn festival lantern', 'oolong tea gift set'], budget: [20, 45], keywords: ['mooncake', 'moon cake', 'mid-autumn', 'mid autumn', 'lantern', 'oolong'] },
  },
  {
    // China's seven-day National Day holiday: 1 October and the days around it
    // (the State Council moves working days to join them, so the real run
    // varies a little by year; the first week of October is the constant).
    id: 'national-day-golden-week',
    name: "China's National Day Golden Week",
    culture: 'Chinese',
    rule: { fixed: '10-01' },
    span: 7,
    aliases: ["China's National Day"],
    traditions: ['Flag raising', 'Family trips', 'Fireworks'],
  },
  {
    id: 'double-ninth',
    name: 'Double Ninth Festival',
    culture: 'Chinese',
    rule: { country: 'TW', name: 'Double Ninth Festival' },
    traditions: ['Chongyang cake', 'Chrysanthemum tea', 'Hill climbing'],
    shop: { queries: ['chrysanthemum tea', 'chrysanthemum tea gift set'], budget: [10, 25], keywords: ['chrysanthemum'] },
  },
  {
    id: 'dongzhi',
    name: 'Dongzhi Festival',
    culture: 'Chinese',
    rule: { country: 'TW', name: 'Dongzhi Festival' },
    traditions: ['Tangyuan', 'Dumplings'],
    shop: { queries: ['tangyuan glutinous rice balls', 'black sesame tangyuan'], budget: [10, 25], keywords: ['tangyuan', 'sesame'] },
  },
  {
    id: 'chuseok',
    name: 'Chuseok',
    culture: 'Korean',
    rule: { sameAs: 'mid-autumn' },
    span: 3,
    traditions: ['Songpyeon', 'Ancestral rites', 'Hanbok'],
    shop: { queries: ['chuseok gift set', 'songpyeon', 'korean red ginseng gift set', 'hanbok'], budget: [25, 60], keywords: ['chuseok', 'songpyeon', 'hanbok', 'ginseng gift'] },
  },
  {
    id: 'songkran',
    name: 'Songkran',
    culture: 'Thai',
    rule: { country: 'TH', name: 'Songkran Festival' },
    span: 3,
    traditions: ['Water splashing', 'Merit making'],
    shop: { queries: ['water blaster toy', 'waterproof phone pouch'], budget: [10, 25], keywords: ['songkran', 'water gun', 'water blaster'] },
  },
  {
    id: 'buddhas-birthday',
    name: "Buddha's Birthday",
    culture: 'Buddhist',
    aliases: ['Vesak'],
    rule: { country: 'TW', name: "Buddha's Birthday" },
    traditions: ['Lantern lighting', 'Buddha bathing', 'Vegetarian feasts'],
  },
  {
    id: 'diwali',
    name: 'Diwali',
    culture: 'Hindu, Sikh, Jain',
    rule: { country: 'MY', name: 'Deepavali' },
    traditions: ['Diya lighting', 'Mithai sweets', 'Rangoli'],
    shop: { queries: ['diwali diya', 'indian sweets gift box', 'rangoli kit', 'diwali decorations led lights'], budget: [15, 40], keywords: ['diwali', 'diya', 'deepavali', 'rangoli', 'mithai', 'indian sweet', 'haldiram', 'puja'] },
  },
  {
    id: 'eid-al-fitr',
    name: 'Eid al-Fitr',
    culture: 'Muslim',
    rule: { country: 'AE', name: 'End of Ramadan (Eid al-Fitr)' },
    aliases: ['Eid al-Fitr'],
    span: 3,
    traditions: ['Dates', 'Maamoul', 'Sheer khurma'],
    shop: { queries: ['eid mubarak decorations', 'medjool dates gift box', 'maamoul cookies'], budget: [15, 40], keywords: ['eid', 'medjool', 'maamoul', 'dates'] },
  },
  {
    id: 'eid-al-adha',
    name: 'Eid al-Adha',
    culture: 'Muslim',
    rule: { country: 'AE', name: 'Feast of the Sacrifice (Eid al-Adha)' },
    aliases: ['Eid al-Adha'],
    span: 3,
    traditions: ['Family feast', 'Giving to charity'],
    shop: { queries: ['eid mubarak gift', 'medjool dates gift box'], budget: [15, 40], keywords: ['eid', 'medjool', 'dates'] },
  },
  {
    id: 'rosh-hashanah',
    name: 'Rosh Hashanah',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Rosh Hashanah (Yom Teruah)' },
    span: 2,
    traditions: ['Apples and honey', 'Round challah', 'Shofar blowing'],
    shop: { queries: ['rosh hashanah honey gift set', 'rosh hashanah apple and honey dish', 'shofar'], budget: [15, 40], keywords: ['rosh hashanah', 'shofar', 'honey', 'challah'] },
  },
  {
    id: 'yom-kippur',
    name: 'Yom Kippur',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Day of Atonement (Yom Kippur)' },
    traditions: ['Fasting', 'Break-fast meal'],
  },
  {
    id: 'sukkot',
    name: 'Sukkot',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Feast of Tabernacles (Sukkot)' },
    span: 7,
    traditions: ['Building a sukkah', 'Etrog and lulav'],
    shop: { queries: ['sukkah decorations', 'etrog lulav'], budget: [15, 40], keywords: ['sukkot', 'sukkah', 'etrog', 'lulav'] },
  },
  {
    id: 'hanukkah',
    name: 'Hanukkah',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Hanukkah' },
    span: 8,
    traditions: ['Menorah lighting', 'Latkes', 'Sufganiyot', 'Dreidel'],
    shop: { queries: ['hanukkah menorah', 'hanukkah candles', 'hanukkah gelt chocolate coins', 'dreidel set'], budget: [10, 30], keywords: ['hanukkah', 'menorah', 'dreidel', 'gelt', 'chanukah'] },
  },
  {
    id: 'passover',
    name: 'Passover',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Passover (Pesach)' },
    aliases: ['Passover'],
    span: 8,
    traditions: ['Seder meal', 'Matzo', 'Seder plate'],
    shop: { queries: ['passover seder plate', 'kosher for passover matzo', 'passover haggadah'], budget: [10, 35], keywords: ['passover', 'seder', 'matzo', 'haggadah'] },
  },
  {
    id: 'purim',
    name: 'Purim',
    culture: 'Jewish',
    rule: { country: 'IL', name: 'Purim' },
    traditions: ['Hamantaschen', 'Costumes', 'Gifts of food'],
    shop: { queries: ['purim costume', 'purim mishloach manot basket'], budget: [15, 40], keywords: ['purim', 'hamantaschen', 'mishloach'] },
  },
  {
    id: 'nowruz',
    name: 'Nowruz',
    culture: 'Persian',
    rule: { country: 'IR', name: 'Nowruz' },
    span: 2,
    traditions: ['Haft-sin table', 'Painted eggs', 'Sabzi polo'],
    shop: { queries: ['nowruz haft sin set', 'haft sin table'], budget: [15, 40], keywords: ['nowruz', 'haft', 'norooz'] },
  },
  {
    id: 'valentines-day',
    name: "Valentine's Day",
    culture: 'Western',
    rule: { fixed: '02-14' },
    traditions: ['Chocolates', 'Roses', 'Cards'],
    shop: { queries: ['valentines day chocolate gift box', 'valentines day teddy bear'], budget: [20, 45], keywords: ['valentine'] },
  },
  {
    id: 'mardi-gras',
    name: 'Mardi Gras',
    culture: 'Louisiana Creole, Catholic',
    rule: { easter: -47 },
    traditions: ['King cake', 'Beads', 'Parades'],
    shop: { queries: ['mardi gras beads', 'king cake'], budget: [10, 30], keywords: ['mardi gras', 'king cake', 'beads'] },
  },
  {
    id: 'st-patricks-day',
    name: "St. Patrick's Day",
    culture: 'Irish',
    rule: { fixed: '03-17' },
    traditions: ['Soda bread', 'Corned beef and cabbage', 'Wearing green'],
    shop: { queries: ['st patricks day decorations', 'irish soda bread mix'], budget: [10, 30], keywords: ['st. patrick', 'st patrick', 'irish', 'shamrock', 'soda bread'] },
  },
  {
    id: 'easter',
    name: 'Easter',
    culture: 'Christian',
    rule: { easter: 0 },
    aliases: ['Easter Sunday'],
    traditions: ['Easter eggs', 'Hot cross buns', 'Chocolate bunnies'],
    shop: { queries: ['easter basket', 'easter egg dye kit', 'chocolate easter bunny'], budget: [15, 35], keywords: ['easter'] },
  },
  {
    id: 'halloween',
    name: 'Halloween',
    culture: 'Western',
    rule: { fixed: '10-31' },
    traditions: ['Trick-or-treating', 'Pumpkin carving', 'Costumes'],
    shop: { queries: ['halloween candy variety pack', 'pumpkin carving kit', 'halloween costume'], budget: [15, 50], keywords: ['halloween', 'trick or treat', 'pumpkin'] },
  },
  {
    id: 'dia-de-muertos',
    name: 'Day of the Dead',
    culture: 'Mexican',
    rule: { fixed: '11-01' },
    span: 2,
    traditions: ['Pan de muerto', 'Sugar skulls', 'Marigolds', 'Ofrendas'],
    shop: { queries: ['day of the dead decorations', 'sugar skull decorations', 'day of the dead ofrenda'], budget: [10, 30], keywords: ['day of the dead', 'dia de', 'muertos', 'sugar skull', 'ofrenda', 'marigold'] },
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    culture: 'American',
    rule: { country: 'US', name: 'Thanksgiving Day' },
    aliases: ['Thanksgiving Day'],
    traditions: ['Roast turkey', 'Pumpkin pie', 'Cranberry sauce'],
    shop: { queries: ['thanksgiving table decor', 'turkey roasting pan', 'thanksgiving dinner cookware'], budget: [20, 60], keywords: ['thanksgiving', 'turkey', 'cranberry', 'roasting'] },
  },
  {
    id: 'christmas',
    name: 'Christmas',
    culture: 'Christian',
    rule: { fixed: '12-25' },
    aliases: ['Christmas Day'],
    traditions: ['Tree decorating', 'Gingerbread', 'Christmas cookies'],
    shop: { queries: ['christmas cookie gift tin', 'christmas ornaments set', 'advent calendar', 'pre-lit artificial christmas tree'], budget: [20, 60], keywords: ['christmas', 'advent', 'ornament', 'gingerbread'] },
  },
  {
    id: 'kwanzaa',
    name: 'Kwanzaa',
    culture: 'African American',
    rule: { fixed: '12-26' },
    span: 7,
    traditions: ['Kinara candles', 'Karamu feast'],
    shop: { queries: ['kwanzaa kinara candle set', 'kwanzaa decorations'], budget: [15, 40], keywords: ['kwanzaa', 'kinara'] },
  },
  {
    id: 'epiphany',
    name: 'Three Kings Day',
    culture: 'Hispanic, Christian',
    rule: { fixed: '01-06' },
    aliases: ['Epiphany'],
    traditions: ['Rosca de reyes', 'Gifts for children'],
  },
  {
    id: 'setsubun',
    name: 'Setsubun',
    culture: 'Japanese',
    rule: { fixed: '02-03' },
    traditions: ['Bean throwing', 'Ehomaki rolls'],
  },
  {
    id: 'hinamatsuri',
    name: 'Hinamatsuri',
    culture: 'Japanese',
    rule: { fixed: '03-03' },
    traditions: ['Hina dolls', 'Hishimochi'],
  },
];

const BY_ID = new Map(HOLIDAYS.map((h) => [h.id, h]));
export const holidayById = (id: string): HolidayDef | undefined => BY_ID.get(id);

// What a holiday's ads are priced as; a holiday shows each of them.
export const AD_TIERS = ['value', 'mid', 'premium'] as const;
export type AdTier = (typeof AD_TIERS)[number];

export function isAdTier(value: unknown): value is AdTier {
  return typeof value === 'string' && (AD_TIERS as readonly string[]).includes(value);
}

// Which of a holiday's three price bands a dollar price is in.
export function tierOf(price: number, budget: [number, number]): AdTier {
  return price < budget[0] ? 'value' : price < budget[1] ? 'mid' : 'premium';
}

// Whole days from one "YYYY-MM-DD" key to another (UTC).
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function addDays(dayKey: string, days: number): string {
  return new Date(Date.parse(`${dayKey}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

// How far `today` is from the holiday's first day: negative before it, and
// whether that is inside the ad window (a month before to three weeks after
// its last day).
export function windowOffset(today: string, start: string, span = 1): { offset: number; active: boolean } {
  const offset = daysBetween(start, today);
  return { offset, active: offset >= -WINDOW_BEFORE_DAYS && offset <= span - 1 + WINDOW_AFTER_DAYS };
}

// A DateTime marker that is an astronomy event, not a holiday.
export const isAstronomyMarker = (title: string) => /\b(perihelion|aphelion|solstice|equinox(es)?)\b/i.test(title);

// The catalog holiday a DateTime marker is the same as, if any.
const BY_TITLE = new Map(HOLIDAYS.flatMap((h) => [h.name, ...(h.aliases ?? [])].map((title) => [title.toLowerCase(), h.id] as const)));
export const holidayForMarker = (title: string): string | undefined => BY_TITLE.get(title.toLowerCase());
