import { LOCALE_NAMES, type Locale } from './i18n/config';

export type AlternateNameJson = {
  name: string;
  label: string;
  script: string;
  locale?: string;
  source: 'tag' | 'translation' | 'product';
};

const HIRAGANA_OR_KATAKANA = /[\u3040-\u30ff]/u;
const HAN = /[\u4e00-\u9fff\u3400-\u4dbf]/u;
const HANGUL = /[\uac00-\ud7af\u1100-\u11ff]/u;
const CYRILLIC = /[\u0400-\u04ff]/u;
const ARABIC = /[\u0600-\u06ff]/u;
const THAI = /[\u0e00-\u0e7f]/u;
const HEBREW = /[\u0590-\u05ff]/u;
const GREEK = /[\u0370-\u03ff]/u;
const MACRONS = /[ōūāīēŌŪĀĪĒ]/;

export function detectScript(text: string): { script: string; label: string } {
  if (HIRAGANA_OR_KATAKANA.test(text)) return { script: 'ja', label: '日本語' };
  if (HANGUL.test(text)) return { script: 'ko', label: '한국어' };
  if (THAI.test(text)) return { script: 'th', label: 'ไทย' };
  if (ARABIC.test(text)) return { script: 'ar', label: 'العربية' };
  if (HEBREW.test(text)) return { script: 'he', label: 'עברית' };
  if (GREEK.test(text)) return { script: 'el', label: 'Ελληνικά' };
  if (CYRILLIC.test(text)) return { script: 'ru', label: 'Русский' };
  if (HAN.test(text)) return { script: 'zh', label: '中文' };
  if (MACRONS.test(text)) return { script: 'romaji', label: 'Romaji' };
  return { script: 'latin', label: 'Alias' };
}

export function labelForLocale(locale?: string): string | undefined {
  if (!locale) return undefined;
  if (locale in LOCALE_NAMES) {
    return LOCALE_NAMES[locale as Locale];
  }
  return undefined;
}

export function extractWorkTitle(headline: string): string | null {
  const jp = headline.match(/[『「]([^』」]+)[』」]/);
  if (jp) return jp[1].trim();
  const zh = headline.match(/《([^》]+)》/);
  if (zh) return zh[1].trim();
  const fr = headline.match(/«\s*([^»]+)\s*»/);
  if (fr) return fr[1].trim();
  const de = headline.match(/„([^“]+)“/);
  if (de) return de[1].trim();
  const quotes = headline.match(/["“]([^"”]+)["”]/);
  if (quotes) return quotes[1].trim();
  const single = headline.match(/'([^']+)'/);
  if (single && single[1].length > 2) return single[1].trim();
  if (headline.includes(' — ')) return headline.split(' — ')[0].trim();
  return null;
}

const GENERIC_TAGS = new Set([
  'horror', 'comedy', 'action', 'romance', 'sci-fi', 'fantasy', 'drama', 'adventure', 'mystery',
  'supernatural', 'thriller', 'animation', 'anime', 'manga', 'movie', 'tv', 'gaming', 'comics', 'food', 'ai',
  'billions', 'box-office', 'record', 'comeback', 'aviation', 'engineer', 'goldfish', 'hand-drawn', 'ocean',
  'classic', 'debut', 'heist', 'campaign', 'collaboration', 'limited edition', 'free entry', 'festival', 'convention',
  'restaurant', 'restaurant opening', 'restaurants', 'ramen', 'vegan ramen', 'vegan', 'sushi', 'pizza', 'bakery',
  'cafe', 'bar', 'diner', 'bistro', 'pub', 'grill', 'bbq', 'steakhouse', 'coffee', 'dessert', 'ice cream', 'snack', 'cone',
]);

const CORPORATE_SUFFIXES = /\b(press|publishing|studios?|animation|entertainment|pictures|corp|inc|llc|ltd)\b/i;

export function isAlternateTag(tagName: string, pinTitle: string, productName?: string | null, company?: string | null): boolean {
  const lower = tagName.trim().toLowerCase();
  if (GENERIC_TAGS.has(lower)) return false;
  if (/^(manga|light novel|novel|anime|game) adaptation$/i.test(lower)) return false;
  if (/^(final chapter|series finale|first chapter|season premiere|season finale)$/i.test(lower)) return false;
  if (/^(restaurant|restaurant opening|restaurants)$/i.test(lower)) return false;
  if (company && lower === company.trim().toLowerCase()) return false;
  if (CORPORATE_SUFFIXES.test(lower)) return false;

  // Non-Latin scripts or macrons: definitely an alternate/native title
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Thai}\p{Script=Hebrew}\p{Script=Greek}]/u.test(tagName)) return true;
  if (MACRONS.test(tagName)) return true;

  // Title acronym (2 to 6 uppercase letters, e.g. FMAB, KnY, FMA)
  if (/^[A-Z]{2,6}$/.test(tagName.trim())) return true;

  // Matches productName
  if (productName && lower === productName.trim().toLowerCase()) return true;

  // Multiple words with subtitle punctuation (: or -)
  if (tagName.includes(':') || tagName.includes(' – ') || tagName.includes(' - ')) return true;

  // Multi-word phrase contained within title or productName
  const normTitle = `${pinTitle} ${productName || ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const normTag = lower.replace(/[^a-z0-9\s]/g, ' ');
  const tagWords = normTag.split(/\s+/).filter(Boolean);
  if (normTitle.includes(normTag) && tagWords.length >= 2) {
    return true;
  }

  // Major keyword overlap with title
  const titleWords = normTitle.split(/\s+/).filter((w) => w.length > 3);
  const significantTagWords = tagWords.filter((w) => w.length > 3);
  const common = significantTagWords.filter((w) => titleWords.includes(w));
  if (common.length >= 1 && tagWords.length >= 2) return true;

  return false;
}

const SCRIPT_PRIORITY: Record<string, number> = {
  ja: 1,
  Japanese: 1,
  romaji: 2,
  Romaji: 2,
  ko: 3,
  Korean: 3,
  zh: 4,
  Chinese: 4,
  en: 5,
  English: 5,
  latin: 6,
  Alias: 6,
  product: 7,
};

export function sortAlternateNames(names: AlternateNameJson[]): AlternateNameJson[] {
  return [...names].sort((a, b) => {
    const pA = SCRIPT_PRIORITY[a.script] ?? SCRIPT_PRIORITY[a.locale ?? ''] ?? 50;
    const pB = SCRIPT_PRIORITY[b.script] ?? SCRIPT_PRIORITY[b.locale ?? ''] ?? 50;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name);
  });
}

