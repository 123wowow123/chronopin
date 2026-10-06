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
  // The same month and day every year ("10-31"), or `leapFixed` in a leap year
  // (Yalda is 21 December, 20 December when the year has a 29 February).
  | { fixed: string; leapFixed?: string }
  // The same day as another catalog holiday, plus `offset` days (Chuseok falls
  // with Mid-Autumn; Maslenitsa starts 55 days before Orthodox Easter).
  | { sameAs: string; offset?: number }
  // Easter Sunday plus this many days.
  | { easter: number }
  // A year-by-year date in src/server/data/festivalDates.json, for the Hindu
  // festivals the package lacks (worked out from the lunisolar calendar, 2001-2035).
  | { table: string }
  // The first `day` (0 = Sunday) on or after a month and day ("05-08": the
  // second Sunday of May).
  | { weekday: { from: string; day: number } }
  // The last `day` before another catalog holiday, plus `offset` days
  // (Chaharshanbe Suri is the eve of the last Wednesday before Nowruz).
  | { weekdayBefore: { id: string; day: number; offset?: number } };

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
    name: "Korea's Chuseok",
    culture: 'Korean',
    aliases: ['Chuseok'],
    rule: { sameAs: 'mid-autumn' },
    span: 3,
    traditions: ['Songpyeon', 'Ancestral rites', 'Hanbok'],
    shop: { queries: ['chuseok gift set', 'songpyeon', 'korean red ginseng gift set', 'hanbok'], budget: [25, 60], keywords: ['chuseok', 'songpyeon', 'hanbok', 'ginseng gift'] },
  },
  {
    id: 'songkran',
    name: "Thailand's Songkran",
    culture: 'Thai',
    aliases: ['Songkran', 'Songkran Festival'],
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
    name: "Japan's Setsubun",
    culture: 'Japanese',
    aliases: ['Setsubun'],
    rule: { fixed: '02-03' },
    traditions: ['Bean throwing', 'Ehomaki rolls'],
  },
  {
    id: 'hinamatsuri',
    name: "Japan's Hinamatsuri",
    culture: 'Japanese',
    aliases: ['Hinamatsuri'],
    rule: { fixed: '03-03' },
    traditions: ['Hina dolls', 'Hishimochi'],
  },
  // Holidays named for their country or region (the date tag says whose it is),
  // added 2026-10-05 after China's National Day Golden Week.
  // East Asia
  {
    id: 'japan-golden-week',
    name: "Japan's Golden Week",
    culture: 'Japanese',
    rule: { fixed: '04-29' },
    span: 7,
    aliases: ['Golden Week'],
    traditions: ['Carp streamers', 'Family trips', 'Kashiwa mochi'],
  },
  {
    id: 'japan-obon',
    name: "Japan's Obon",
    culture: 'Japanese',
    rule: { fixed: '08-13' },
    span: 4,
    aliases: ['Obon'],
    traditions: ['Bon odori dancing', 'Grave visits', 'Lantern floating'],
  },
  {
    id: 'japan-new-year',
    name: "Japan's New Year",
    culture: 'Japanese',
    rule: { fixed: '01-01' },
    span: 3,
    aliases: ['Oshogatsu'],
    traditions: ['Osechi', 'Hatsumode', 'Otoshidama', 'Kagami mochi'],
  },
  {
    id: 'china-labor-day',
    name: "China's Labor Day Holiday",
    culture: 'Chinese',
    rule: { fixed: '05-01' },
    span: 5,
    traditions: ['Family trips', 'Spring outings'],
  },
  {
    id: 'china-singles-day',
    name: "China's Singles' Day",
    culture: 'Chinese',
    rule: { fixed: '11-11' },
    aliases: ["Singles' Day"],
    traditions: ['Online sales', 'Livestream shopping', 'Gifts for yourself'],
  },
  {
    id: 'korea-seollal',
    name: "Korea's Seollal",
    culture: 'Korean',
    // Korea's lunar new year can fall a day after China's (2027).
    rule: { country: 'KR', name: 'Korean New Year' },
    aliases: ['Seollal'],
    traditions: ['Tteokguk', 'Sebae bows', 'Yutnori', 'Hanbok'],
  },
  {
    id: 'vietnam-tet',
    name: "Vietnam's Tết",
    culture: 'Vietnamese',
    rule: { country: 'VN', name: 'Vietnamese New Year' },
    span: 3,
    aliases: ['Tết'],
    traditions: ['Banh chung', 'Peach blossoms', 'Kumquat trees', 'Lucky money'],
  },
  // Southeast Asia
  {
    id: 'cambodia-khmer-new-year',
    name: "Cambodia's Khmer New Year",
    culture: 'Khmer',
    // 13 or 14 April to 16: the middle of the usual run.
    rule: { fixed: '04-14' },
    span: 3,
    traditions: ['Water blessings', 'Sand mounds', 'Temple visits'],
  },
  {
    id: 'myanmar-thingyan',
    name: "Myanmar's Thingyan",
    culture: 'Burmese',
    rule: { fixed: '04-13' },
    span: 4,
    traditions: ['Water splashing', 'Thanaka paste', 'Merit making'],
  },
  {
    id: 'thailand-loy-krathong',
    name: "Thailand's Loy Krathong",
    culture: 'Thai',
    // The full moon of the twelfth lunar month, the same as Kartik Purnima
    // (Dev Diwali): the Thai calendar's leap-month years (2020) can differ by a month.
    rule: { table: 'kartik-purnima' },
    traditions: ['Krathong floating', 'Sky lanterns'],
  },
  // India and South Asia
  {
    id: 'india-holi',
    name: "India's Holi",
    culture: 'Hindu',
    rule: { table: 'holi' },
    traditions: ['Colored powder', 'Holika bonfire', 'Gujiya', 'Thandai'],
    shop: { queries: ['holi color powder', 'holi gulal colors', 'holi pichkari water gun'], budget: [10, 25], keywords: ['holi', 'gulal', 'pichkari', 'color powder'] },
  },
  {
    id: 'india-navratri',
    name: "India's Navratri",
    culture: 'Hindu',
    rule: { table: 'sharad-navratri' },
    span: 9,
    traditions: ['Garba and dandiya', 'Fasting', 'Durga worship'],
    shop: { queries: ['dandiya sticks', 'navratri decoration', 'durga idol'], budget: [15, 40], keywords: ['dandiya', 'navratri', 'durga', 'garba'] },
  },
  {
    id: 'india-dussehra',
    name: "India's Dussehra",
    culture: 'Hindu',
    rule: { table: 'dussehra' },
    aliases: ['Dussehra'],
    traditions: ['Ravana effigy burning', 'Ramlila plays', 'Jalebi'],
  },
  {
    id: 'india-ganesh-chaturthi',
    name: "India's Ganesh Chaturthi",
    culture: 'Hindu',
    rule: { table: 'ganesh-chaturthi' },
    span: 10,
    aliases: ['Ganesh Chaturthi'],
    traditions: ['Ganesh idols', 'Modak', 'Idol immersion'],
    shop: { queries: ['ganesh idol', 'ganesh chaturthi decoration', 'modak mold'], budget: [15, 40], keywords: ['ganesh', 'ganpati', 'modak'] },
  },
  {
    id: 'india-raksha-bandhan',
    name: "India's Raksha Bandhan",
    culture: 'Hindu',
    rule: { table: 'raksha-bandhan' },
    aliases: ['Raksha Bandhan'],
    traditions: ['Rakhi threads', 'Sweets for siblings', 'Gift giving'],
    shop: { queries: ['rakhi for brother', 'rakhi gift set', 'raksha bandhan gift'], budget: [10, 30], keywords: ['rakhi', 'raksha bandhan'] },
  },
  {
    id: 'kerala-onam',
    name: "Kerala's Onam",
    culture: 'Malayali',
    rule: { table: 'onam' },
    aliases: ['Onam'],
    traditions: ['Pookalam flower carpets', 'Onam sadya feast', 'Snake boat races'],
  },
  {
    id: 'india-pongal',
    name: "India's Pongal and Makar Sankranti",
    culture: 'Tamil, Hindu',
    rule: { table: 'pongal' },
    span: 3,
    aliases: ['Pongal', 'Makar Sankranti'],
    traditions: ['Sweet pongal', 'Kite flying', 'Kolam designs'],
  },
  // Muslim and Persian
  {
    id: 'ramadan',
    name: 'Ramadan',
    culture: 'Muslim',
    rule: { country: 'AE', name: 'First day of Ramadan' },
    span: 30,
    aliases: ['First day of Ramadan'],
    traditions: ['Iftar', 'Suhoor', 'Taraweeh prayers', 'Dates'],
    shop: { queries: ['ramadan decorations', 'ramadan lantern', 'medjool dates gift box'], budget: [15, 40], keywords: ['ramadan', 'fanous', 'iftar', 'medjool', 'dates'] },
  },
  {
    id: 'mawlid',
    name: 'Mawlid',
    culture: 'Muslim',
    rule: { country: 'AE', name: 'Birthday of Muhammad (Mawlid)' },
    aliases: ['Birthday of Muhammad (Mawlid)'],
    traditions: ['Mawlid processions', 'Nasheed recitals', 'Charity meals'],
  },
  {
    id: 'ashura',
    name: 'Ashura',
    culture: 'Muslim',
    rule: { country: 'IR', name: 'Ashoura' },
    aliases: ['Ashoura', 'Day of Ashura'],
    traditions: ['Mourning processions', 'Fasting', 'Charity meals'],
  },
  {
    id: 'yalda',
    name: "Iran's Yalda Night",
    culture: 'Persian',
    rule: { fixed: '12-21', leapFixed: '12-20' },
    aliases: ['Yalda Night'],
    traditions: ['Pomegranates', 'Watermelon', 'Hafez poetry'],
  },
  {
    id: 'chaharshanbe-suri',
    name: "Iran's Chaharshanbe Suri",
    culture: 'Persian',
    rule: { weekdayBefore: { id: 'nowruz', day: 3, offset: -1 } },
    traditions: ['Bonfire jumping', 'Ajil nuts', 'Spoon banging'],
  },
  // Orthodox Christian and Ethiopian
  {
    id: 'orthodox-christmas',
    name: 'Orthodox Christmas (Eastern Europe)',
    culture: 'Orthodox Christian',
    rule: { fixed: '01-07' },
    aliases: ['Orthodox Christmas'],
    traditions: ['Holy Supper', 'Kutia', 'Caroling'],
  },
  {
    id: 'orthodox-easter',
    name: 'Orthodox Easter (Eastern Europe)',
    culture: 'Orthodox Christian',
    // Greece's Easter Sunday is the Orthodox one.
    rule: { country: 'GR', name: 'Easter Sunday' },
    aliases: ['Orthodox Easter'],
    traditions: ['Midnight service', 'Red eggs', 'Paska bread'],
  },
  {
    id: 'russia-maslenitsa',
    name: "Russia's Maslenitsa",
    culture: 'Russian',
    // Butter Week: the Monday to the Sunday of Forgiveness, 55 to 49 days before Orthodox Easter.
    rule: { sameAs: 'orthodox-easter', offset: -55 },
    span: 7,
    aliases: ['Maslenitsa'],
    traditions: ['Blini pancakes', 'Effigy burning', 'Sleigh rides'],
  },
  {
    id: 'ethiopia-enkutatash',
    name: "Ethiopia's Enkutatash",
    culture: 'Ethiopian',
    rule: { country: 'ET', name: "New Year's Day" },
    traditions: ['Adey Abeba flowers', 'Family feast'],
  },
  {
    id: 'ethiopia-timkat',
    name: "Ethiopia's Timkat",
    culture: 'Ethiopian',
    rule: { country: 'ET', name: 'Epiphany' },
    aliases: ['Timkat'],
    traditions: ['Tabot processions', 'Baptism renewal', 'White shamma robes'],
  },
  // North America and Latin America
  {
    id: 'us-mlk-day',
    name: 'Martin Luther King Jr. Day',
    culture: 'American',
    rule: { weekday: { from: '01-15', day: 1 } },
    traditions: ['Day of service', 'Marches', 'Speech readings'],
  },
  {
    id: 'us-presidents-day',
    name: "Presidents' Day",
    culture: 'American',
    rule: { weekday: { from: '02-15', day: 1 } },
    aliases: ["Washington's Birthday"],
    traditions: ['Holiday sales', 'Presidential history', 'Cherry pie'],
  },
  {
    id: 'us-memorial-day',
    name: 'Memorial Day',
    culture: 'American',
    rule: { weekday: { from: '05-25', day: 1 } },
    traditions: ['Flags at half-staff', 'Graveside flowers', 'Parades', 'Barbecues'],
  },
  {
    id: 'us-juneteenth',
    name: 'Juneteenth',
    culture: 'African American',
    rule: { fixed: '06-19' },
    traditions: ['Parades', 'Barbecues', 'Freedom readings'],
  },
  {
    id: 'us-labor-day',
    name: 'Labor Day',
    culture: 'American',
    rule: { weekday: { from: '09-01', day: 1 } },
    traditions: ['Barbecues', 'Parades', 'Last beach weekend'],
  },
  {
    id: 'us-columbus-day',
    name: 'Columbus Day',
    culture: 'American',
    rule: { weekday: { from: '10-08', day: 1 } },
    aliases: ["Indigenous Peoples' Day"],
    traditions: ['Parades', 'Italian heritage festivals', 'Holiday sales'],
  },
  {
    id: 'us-veterans-day',
    name: 'Veterans Day',
    culture: 'American',
    rule: { fixed: '11-11' },
    traditions: ['Parades', 'Moment of silence', 'Wreath laying', 'Poppies'],
  },
  {
    id: 'us-independence-day',
    name: 'US Independence Day',
    culture: 'American',
    rule: { fixed: '07-04' },
    aliases: ['Independence Day'],
    traditions: ['Fireworks', 'Barbecues', 'Parades'],
    shop: { queries: ['american flag', 'fourth of july decorations', 'patriotic party supplies'], budget: [15, 40], keywords: ['american flag', '4th of july', 'fourth of july', 'patriotic', 'independence day'] },
  },
  {
    id: 'us-mothers-day',
    name: "Mother's Day (US)",
    culture: 'American',
    rule: { weekday: { from: '05-08', day: 0 } },
    aliases: ["Mother's Day"],
    traditions: ['Flowers', 'Brunch', 'Cards'],
    shop: { queries: ['mothers day gift set', 'mothers day gift basket'], budget: [20, 50], keywords: ['mother'] },
  },
  {
    id: 'us-fathers-day',
    name: "Father's Day (US)",
    culture: 'American',
    rule: { weekday: { from: '06-15', day: 0 } },
    aliases: ["Father's Day"],
    traditions: ['Grilling', 'Neckties', 'Cards'],
    shop: { queries: ['fathers day gift', 'fathers day gift set for dad'], budget: [20, 50], keywords: ['father', 'dad'] },
  },
  {
    id: 'us-black-friday',
    name: 'Black Friday (US)',
    culture: 'American',
    // The day after Thanksgiving: the first Friday on or after 23 November.
    rule: { weekday: { from: '11-23', day: 5 } },
    aliases: ['Black Friday'],
    traditions: ['Doorbuster sales', 'Early-morning lines', 'Online deals'],
  },
  {
    id: 'canada-day',
    name: 'Canada Day',
    culture: 'Canadian',
    rule: { fixed: '07-01' },
    traditions: ['Fireworks', 'Parades', 'Barbecues'],
  },
  {
    id: 'mexico-cinco-de-mayo',
    name: "Mexico's Cinco de Mayo",
    culture: 'Mexican',
    rule: { fixed: '05-05' },
    aliases: ['Cinco de Mayo'],
    traditions: ['Tacos', 'Mariachi music', 'Folklorico dancing'],
    shop: { queries: ['cinco de mayo decorations', 'papel picado banner', 'cinco de mayo party supplies'], budget: [10, 30], keywords: ['cinco de mayo', 'papel picado', 'fiesta'] },
  },
  {
    id: 'mexico-guadalupe',
    name: "Mexico's Our Lady of Guadalupe",
    culture: 'Mexican',
    rule: { fixed: '12-12' },
    aliases: ['Day of the Virgin of Guadalupe'],
    traditions: ['Basilica pilgrimage', 'Las Mananitas serenade', 'Roses'],
  },
  {
    id: 'mexico-posadas',
    name: "Mexico's Las Posadas",
    culture: 'Mexican',
    rule: { fixed: '12-16' },
    span: 9,
    aliases: ['Las Posadas'],
    traditions: ['Pinatas', 'Ponche', 'Candlelit processions'],
    shop: { queries: ['pinata', 'christmas pinata'], budget: [10, 30], keywords: ['pinata', 'piñata', 'posada'] },
  },
  {
    id: 'brazil-carnival',
    name: "Brazil's Carnival",
    culture: 'Brazilian, Latin American',
    // Saturday to Tuesday before Ash Wednesday.
    rule: { easter: -50 },
    span: 4,
    aliases: ['Carnival'],
    traditions: ['Samba parades', 'Street blocos', 'Costumes'],
    shop: { queries: ['carnival mask feathers', 'carnival costume accessories'], budget: [10, 30], keywords: ['carnival', 'mask', 'feather', 'samba'] },
  },
  {
    id: 'brazil-festa-junina',
    name: "Brazil's Festa Junina",
    culture: 'Brazilian',
    // The month of June festivals peaks on São João, 24 June.
    rule: { fixed: '06-24' },
    traditions: ['Quadrilha dancing', 'Bonfires', 'Corn sweets'],
  },
  // Europe and the Commonwealth
  {
    id: 'france-bastille-day',
    name: "France's Bastille Day",
    culture: 'French',
    rule: { fixed: '07-14' },
    aliases: ['Bastille Day'],
    traditions: ['Military parade', 'Fireworks', 'Firemen balls'],
  },
  {
    id: 'germany-oktoberfest',
    name: "Germany's Oktoberfest",
    culture: 'Bavarian',
    // Opens the first Saturday on or after 15 September and runs 16 days.
    rule: { weekday: { from: '09-15', day: 6 } },
    span: 16,
    traditions: ['Beer tents', 'Pretzels', 'Dirndl and lederhosen'],
    shop: { queries: ['dirndl dress', 'lederhosen', 'oktoberfest costume'], budget: [20, 50], keywords: ['dirndl', 'lederhosen', 'oktoberfest', 'bavarian'] },
  },
  {
    id: 'nordic-midsummer',
    name: 'Nordic Midsummer',
    culture: 'Swedish, Finnish, Nordic',
    // The Friday between 19 and 25 June, and the day after.
    rule: { country: 'SE', name: 'Midsummer Eve' },
    span: 2,
    aliases: ['Midsummer Eve', 'Midsummer Day'],
    traditions: ['Maypole dancing', 'Flower crowns', 'Pickled herring'],
  },
  {
    id: 'sweden-st-lucia',
    name: "Sweden's St. Lucia Day",
    culture: 'Swedish',
    rule: { fixed: '12-13' },
    traditions: ['Lucia processions', 'Saffron buns', 'Candle crowns'],
  },
  {
    id: 'uk-boxing-day',
    name: 'Boxing Day (UK and Commonwealth)',
    culture: 'British, Commonwealth',
    rule: { fixed: '12-26' },
    aliases: ['Boxing Day'],
    traditions: ['Boxing Day sales', 'Football matches', 'Leftover feasts'],
  },
  {
    id: 'uk-guy-fawkes',
    name: "UK's Guy Fawkes Night",
    culture: 'British',
    rule: { fixed: '11-05' },
    aliases: ['Guy Fawkes Night', 'Bonfire Night'],
    traditions: ['Bonfires', 'Fireworks', 'Toffee apples'],
  },
  {
    id: 'scotland-hogmanay',
    name: "Scotland's Hogmanay",
    culture: 'Scottish',
    // 31 December and 1 January.
    rule: { fixed: '12-31' },
    span: 2,
    aliases: ['Hogmanay'],
    traditions: ['First-footing', 'Fireworks', 'Auld Lang Syne'],
  },
  {
    id: 'anzac-day',
    name: "Australia and New Zealand's Anzac Day",
    culture: 'Australian, New Zealander',
    rule: { fixed: '04-25' },
    aliases: ['Anzac Day'],
    traditions: ['Dawn services', 'Anzac biscuits', 'Poppies'],
  },
  {
    id: 'russia-victory-day',
    name: "Russia's Victory Day",
    culture: 'Russian',
    rule: { fixed: '05-09' },
    aliases: ['Victory Day'],
    traditions: ['Military parade', 'Wreath laying', "St. George's ribbons"],
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
