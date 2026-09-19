// The few words src/lib/format.ts puts around dates, per language. Kept apart
// from the message dictionaries because format.ts runs everywhere, in the
// browser too, and should not bring six dictionaries with it.

import type { Locale } from './config';

type Words = {
  // "Starts {date}"
  starts: string;
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
};

export function fillWords(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}
