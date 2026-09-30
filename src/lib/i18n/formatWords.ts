// The few words src/lib/format.ts puts around dates, per language. Kept apart
// from the message dictionaries because format.ts runs everywhere, in the
// browser too, and should not bring eight dictionaries with it.

import type { Locale } from './config';

type Words = {
  // "Starts {date}"
  starts: string;
  // The span of an all-day pin that runs over several days: "{start} - {end}".
  range: string;
  allDay: string;
  // "{date} at {time}"
  at: string;
  today: string;
  // An unbounded window ("posted within: All").
  all: string;
  // A year before the common era: "{year} BC".
  bc: string;
  // Order of a numeric date: "09/14/2026", "14/09/2026", "14.09.2026", "2026/09/14".
  dateOrder: 'mdy' | 'dmy' | 'ymd';
  dateSeparator: string;
  // Sun .. Sat, the planets the weekdays are named for.
  planets: [string, string, string, string, string, string, string];
  moonPhases: [string, string, string, string, string, string, string, string];
  // The gloss after 农历 in a lunar date's title; empty where it needs none.
  lunarGloss: string;
};

export const FORMAT_WORDS: Record<Locale, Words> = {
  en: {
    starts: 'Starts {date}',
    range: '{start} - {end}',
    allDay: 'All day',
    at: '{date} at {time}',
    today: 'Today',
    all: 'All',
    bc: '{year} BC',
    dateOrder: 'mdy',
    dateSeparator: '/',
    planets: ['The Sun', 'The Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'],
    moonPhases: ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'],
    lunarGloss: 'Nong Li, Chinese lunar calendar',
  },
  es: {
    starts: 'Empieza el {date}',
    range: 'Del {start} al {end}',
    allDay: 'Todo el día',
    at: '{date} a las {time}',
    today: 'Hoy',
    all: 'Todo',
    bc: '{year} a. C.',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['El Sol', 'La Luna', 'Marte', 'Mercurio', 'Júpiter', 'Venus', 'Saturno'],
    moonPhases: ['Luna nueva', 'Luna creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Luna menguante'],
    lunarGloss: 'Nong Li, calendario lunar chino',
  },
  fr: {
    starts: 'Commence le {date}',
    range: 'Du {start} au {end}',
    allDay: 'Toute la journée',
    at: '{date} à {time}',
    today: "Aujourd'hui",
    all: 'Tout',
    bc: '{year} av. J.-C.',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['Le Soleil', 'La Lune', 'Mars', 'Mercure', 'Jupiter', 'Vénus', 'Saturne'],
    moonPhases: ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Gibbeuse croissante', 'Pleine lune', 'Gibbeuse décroissante', 'Dernier quartier', 'Dernier croissant'],
    lunarGloss: 'Nong Li, calendrier lunaire chinois',
  },
  de: {
    starts: 'Beginnt am {date}',
    range: '{start} - {end}',
    allDay: 'Ganztägig',
    at: '{date} um {time}',
    today: 'Heute',
    all: 'Alle',
    bc: '{year} v. Chr.',
    dateOrder: 'dmy',
    dateSeparator: '.',
    planets: ['Die Sonne', 'Der Mond', 'Mars', 'Merkur', 'Jupiter', 'Venus', 'Saturn'],
    moonPhases: ['Neumond', 'Zunehmende Sichel', 'Erstes Viertel', 'Zunehmender Mond', 'Vollmond', 'Abnehmender Mond', 'Letztes Viertel', 'Abnehmende Sichel'],
    lunarGloss: 'Nong Li, chinesischer Mondkalender',
  },
  ja: {
    starts: '開始 {date}',
    range: '{start}〜{end}',
    allDay: '終日',
    at: '{date} {time}',
    today: '今日',
    all: 'すべて',
    bc: '紀元前{year}年',
    dateOrder: 'ymd',
    dateSeparator: '/',
    planets: ['太陽', '月', '火星', '水星', '木星', '金星', '土星'],
    moonPhases: ['新月', '三日月', '上弦の月', '十三夜月', '満月', '寝待月', '下弦の月', '有明月'],
    lunarGloss: '旧暦',
  },
  zh: {
    starts: '开始于 {date}',
    range: '{start}至{end}',
    allDay: '全天',
    at: '{date} {time}',
    today: '今天',
    all: '全部',
    bc: '公元前{year}年',
    dateOrder: 'ymd',
    dateSeparator: '/',
    planets: ['太阳', '月亮', '火星', '水星', '木星', '金星', '土星'],
    moonPhases: ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'],
    lunarGloss: '',
  },
  ko: {
    starts: '{date} 시작',
    range: '{start} ~ {end}',
    allDay: '종일',
    at: '{date} {time}',
    today: '오늘',
    all: '전체',
    bc: '기원전 {year}년',
    dateOrder: 'ymd',
    dateSeparator: '.',
    planets: ['태양', '달', '화성', '수성', '목성', '금성', '토성'],
    moonPhases: ['삭', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달'],
    lunarGloss: '음력',
  },
  hi: {
    starts: '{date} से शुरू',
    range: '{start} - {end}',
    allDay: 'पूरे दिन',
    at: '{date}, {time}',
    today: 'आज',
    all: 'सभी',
    bc: '{year} ई.पू.',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['सूर्य', 'चंद्रमा', 'मंगल', 'बुध', 'बृहस्पति', 'शुक्र', 'शनि'],
    moonPhases: ['अमावस्या', 'बढ़ता अर्धचंद्र', 'प्रथम चतुर्थांश', 'बढ़ता चंद्रमा', 'पूर्णिमा', 'घटता चंद्रमा', 'अंतिम चतुर्थांश', 'घटता अर्धचंद्र'],
    lunarGloss: 'नोंग ली, चीनी चंद्र पंचांग',
  },
  ar: {
    starts: 'يبدأ في {date}',
    range: '{start} - {end}',
    allDay: 'طوال اليوم',
    at: '{date} في {time}',
    today: 'اليوم',
    all: 'الكل',
    bc: '{year} ق.م',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['الشمس', 'القمر', 'المريخ', 'عطارد', 'المشتري', 'الزهرة', 'زحل'],
    moonPhases: ['محاق', 'هلال متزايد', 'تربيع أول', 'أحدب متزايد', 'بدر', 'أحدب متناقص', 'تربيع أخير', 'هلال متناقص'],
    lunarGloss: 'التقويم القمري الصيني',
  },
  th: {
    starts: 'เริ่ม {date}',
    range: '{start} - {end}',
    allDay: 'ทั้งวัน',
    at: '{date} เวลา {time}',
    today: 'วันนี้',
    all: 'ทั้งหมด',
    bc: '{year} ปีก่อนคริสตกาล',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['ดวงอาทิตย์', 'ดวงจันทร์', 'ดาวอังคาร', 'ดาวพุธ', 'ดาวพฤหัสบดี', 'ดาวศุกร์', 'ดาวเสาร์'],
    moonPhases: ['จันทร์ดับ', 'จันทร์เสี้ยวข้างขึ้น', 'ขึ้นครึ่งดวง', 'ข้างขึ้นค่อนดวง', 'จันทร์เต็มดวง', 'ข้างแรมค่อนดวง', 'แรมครึ่งดวง', 'จันทร์เสี้ยวข้างแรม'],
    lunarGloss: 'หนงลี่ ปฏิทินจันทรคติจีน',
  },
  it: {
    starts: 'Inizia il {date}',
    range: 'Dal {start} al {end}',
    allDay: 'Tutto il giorno',
    at: '{date} alle {time}',
    today: 'Oggi',
    all: 'Tutto',
    bc: '{year} a.C.',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['Il Sole', 'La Luna', 'Marte', 'Mercurio', 'Giove', 'Venere', 'Saturno'],
    moonPhases: ['Luna nuova', 'Luna crescente', 'Primo quarto', 'Gibbosa crescente', 'Luna piena', 'Gibbosa calante', 'Ultimo quarto', 'Luna calante'],
    lunarGloss: 'Nong Li, calendario lunare cinese',
  },
  ru: {
    starts: 'Начало {date}',
    range: '{start} - {end}',
    allDay: 'Весь день',
    at: '{date} в {time}',
    today: 'Сегодня',
    all: 'Все',
    bc: '{year} до н. э.',
    dateOrder: 'dmy',
    dateSeparator: '.',
    planets: ['Солнце', 'Луна', 'Марс', 'Меркурий', 'Юпитер', 'Венера', 'Сатурн'],
    moonPhases: ['Новолуние', 'Растущий серп', 'Первая четверть', 'Растущая луна', 'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Убывающий серп'],
    lunarGloss: 'Нунли, китайский лунный календарь',
  },
  pt: {
    starts: 'Começa em {date}',
    range: 'De {start} a {end}',
    allDay: 'Dia inteiro',
    at: '{date} às {time}',
    today: 'Hoje',
    all: 'Tudo',
    bc: '{year} a.C.',
    dateOrder: 'dmy',
    dateSeparator: '/',
    planets: ['O Sol', 'A Lua', 'Marte', 'Mercúrio', 'Júpiter', 'Vênus', 'Saturno'],
    moonPhases: ['Lua nova', 'Lua crescente', 'Quarto crescente', 'Crescente gibosa', 'Lua cheia', 'Minguante gibosa', 'Quarto minguante', 'Lua minguante'],
    lunarGloss: 'Nong Li, calendário lunar chinês',
  },
};

export function fillWords(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}
