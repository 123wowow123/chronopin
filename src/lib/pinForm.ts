// Converting between a pin and what its form edits. All-day pins are stored as
// whole UTC days (start 00:00Z of the first day, end 00:00Z of the day after
// the last, exclusive); the form works in the viewer's local calendar.

import { addDays, pickDates } from './dateClaims';
import { compareDayKeys, dayKeyOf, dayKeyParts, dayKeyToMs } from './format';
import type { PinAwardJson } from './awards';
import type { ScrapedStock } from './stocks';
import type { PageEntry } from './pageEntries';
import { joinTags, splitTags } from './tags';
import type { MediumJson, MerchantJson, PinJson, PinRatingJson, PinReferenceJson } from './types';

// What /api/scrape answers: a draft pin, plus the promotional video it found
// for a film, series or anime (also listed in media).
// A scrape's stocks are the article's tickers (ScrapedStock), not a stored pin's.
// Its tags are the extracted names, not a stored pin's tag rows.
export type ScrapedPin = Omit<Partial<PinJson>, 'stocks' | 'tags'> & {
  trailer?: MediumJson;
  stocks?: ScrapedStock[];
  awards?: PinAwardJson[];
  tags?: string[];
  // The earlier season's pin this one follows on from (server/scrape/prequel.ts).
  respondTo?: Pick<PinJson, 'id' | 'title'>;
  // A release-notes or changelog page's dated entries (./pageEntries.ts).
  entries?: { pageTitle: string; list: PageEntry[] };
};

export type PinFormValues = {
  id?: number;
  // null: posted on its own, not threaded under an earlier season's pin.
  parentId?: number | null;
  sourceUrl: string;
  title: string;
  description: string;
  longFormSummary: string;
  allDay: boolean;
  // The dates the source gives. The pin is saved with the most confident
  // reference's dates where one outranks these (formDates).
  startDate: string; // YYYY-MM-DD (local)
  startTime: string; // HH:MM (local), timed pins only
  endDate: string;
  endTime: string;
  // Its categories (category tags), the main one first. Always sent whole.
  categories: string[];
  company: string;
  // The company name the wiki link below belongs to (as loaded or scraped).
  companyWikiFor: string;
  companyWikiUrl: string;
  address: string;
  latitude: string;
  longitude: string;
  price: string;
  priceCurrency: string;
  priceLowerBound?: number;
  priceUpperBound?: number;
  tip?: string;
  dateConfidence: string;
  dateConfidenceReasoning: string;
  // The day first promised before the start slipped (YYYY-MM-DD, a UTC day),
  // and how it and the new date were found.
  originalStartDate: string;
  delayReasoning: string;
  merchants: MerchantJson[];
  references: ReferenceFormValues[];
  media: MediumJson[];
  selectedMedia?: MediumJson;
  useMedia: boolean;
  // Media saved alongside the heading: a stored pin's other media, and a
  // scraped trailer. The heading picker only ever chose one medium, so
  // without this an edit deleted every medium but the heading.
  extraMedia: MediumJson[];
  // Review-site scores from the scrape. Not editable, only carried.
  ratings: PinRatingJson[];
  // Stock tickers the scraped article names, sent with the pin, which adds
  // them (never removes: the pin page edits a pin's tickers). Can be dropped.
  stocks: ScrapedStock[];
  // What the scraped work won or was nominated for, shown only: the save
  // matches awards from the pin's title itself.
  awards: PinAwardJson[];
  // The pin's own tags as typed, comma-separated. Always sent, as the whole
  // list; the awards' and the text's tags are the server's (src/lib/tags.ts).
  tags: string;
};

// A reference row as typed: confidence stays a string until it is sent.
export type ReferenceFormValues = Omit<PinReferenceJson, 'confidence' | 'title' | 'publishedDate' | 'startDate' | 'endDate' | 'reasoning'> & {
  title: string;
  reasoning: string;
  confidence: string;
  publishedDate: string;
  startDate: string;
  endDate: string;
};

export const EMPTY_FORM: PinFormValues = {
  sourceUrl: '',
  title: '',
  description: '',
  longFormSummary: '',
  allDay: true,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  categories: [],
  company: '',
  companyWikiFor: '',
  companyWikiUrl: '',
  address: '',
  latitude: '',
  longitude: '',
  price: '',
  priceCurrency: '',
  dateConfidence: '',
  dateConfidenceReasoning: '',
  originalStartDate: '',
  delayReasoning: '',
  merchants: [],
  references: [],
  media: [],
  useMedia: true,
  extraMedia: [],
  ratings: [],
  stocks: [],
  awards: [],
  tags: '',
};

// The form's dates are day keys (src/lib/format.ts), so a BC pin's survive
// the round trip: 2561 BC is "-2560-01-01".
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => dayKeyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const utcDate = (d: Date) => dayKeyOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());

export type Era = 'AD' | 'BC';

export function eraOf(key: string): Era {
  return key && dayKeyParts(key)[0] <= 0 ? 'BC' : 'AD';
}

// What a date input shows for a day key: the year as written, its era beside
// it. An <input type="date"> has no BC, so 2561 BC is shown as 2561.
export function dateInputValue(key: string): string {
  if (!key) return '';
  const [y, m, d] = dayKeyParts(key);
  return y > 0 ? key : dayKeyOf(1 - y, m, d);
}

// The day key for what a date input holds, read in an era.
export function dayKeyFromInput(value: string, era: Era): string {
  if (!value) return '';
  const [y, m, d] = dayKeyParts(value);
  return era === 'BC' ? dayKeyOf(1 - y, m, d) : dayKeyOf(y, m, d);
}

// The date fields for a pin. An all-day pin's exclusive end becomes its last
// day, and is dropped when that is the start day.
export function datesToForm(pin: Pick<PinJson, 'utcStartDateTime' | 'utcEndDateTime' | 'allDay'>) {
  const start = pin.utcStartDateTime ? new Date(pin.utcStartDateTime) : null;
  const end = pin.utcEndDateTime ? new Date(pin.utcEndDateTime) : null;
  if (pin.allDay) {
    const startDate = start ? utcDate(start) : '';
    let endDate = end ? addDays(utcDate(end), -1) : '';
    if (endDate && (!startDate || compareDayKeys(endDate, startDate) <= 0)) endDate = '';
    return { startDate, startTime: '', endDate, endTime: '' };
  }
  return {
    startDate: start ? localDate(start) : '',
    startTime: start ? localTime(start) : '',
    endDate: end ? localDate(end) : '',
    endTime: end ? localTime(end) : '',
  };
}

// utcStartDateTime/utcEndDateTime from the date fields.
export function formToDates(values: Pick<PinFormValues, 'allDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>) {
  if (!values.startDate) {
    return { utcStartDateTime: undefined, utcEndDateTime: undefined };
  }
  if (values.allDay) {
    // toISOString writes a BC year as "-002560", which Date and the server read back.
    const start = new Date(dayKeyToMs(values.startDate)).toISOString();
    const end = values.endDate && compareDayKeys(values.endDate, values.startDate) > 0 ? new Date(dayKeyToMs(addDays(values.endDate, 1))).toISOString() : undefined;
    return { utcStartDateTime: start, utcEndDateTime: end };
  }
  const toInstant = (date: string, time: string) => {
    const [y, m, d] = dayKeyParts(date);
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    // The year set on its own: new Date(y, ...) reads years 0-99 as 1900-1999.
    const instant = new Date(2000, 0, 1, hh, mm);
    instant.setFullYear(y, m - 1, d);
    return instant.toISOString();
  };
  const start = toInstant(values.startDate, values.startTime);
  const end = values.endDate ? toInstant(values.endDate, values.endTime) : undefined;
  return { utcStartDateTime: start, utcEndDateTime: end && Date.parse(end) > Date.parse(start) ? end : undefined };
}

const str = (v: unknown) => (v == null ? '' : String(v));

const referenceToForm = (r: PinReferenceJson): ReferenceFormValues => ({
  ...r,
  title: str(r.title),
  confidence: str(r.confidence),
  publishedDate: str(r.publishedDate),
  startDate: str(r.startDate),
  endDate: str(r.endDate),
  reasoning: str(r.reasoning),
});

// Every field of a stored pin, so saving the form never clears one: the
// update writes every column, and a field the form did not carry is erased.
export function pinToForm(pin: PinJson): PinFormValues {
  return {
    ...EMPTY_FORM,
    id: pin.id,
    parentId: pin.parentId,
    sourceUrl: str(pin.sourceUrl),
    title: str(pin.title),
    description: str(pin.description),
    longFormSummary: str(pin.longFormSummary),
    allDay: !!pin.allDay,
    // The form edits the source's dates; they are only stored apart from the
    // pin's while a reference overrides them.
    ...datesToForm(pin.sourceStartDateTime ? { utcStartDateTime: pin.sourceStartDateTime, utcEndDateTime: pin.sourceEndDateTime, allDay: pin.allDay } : pin),
    categories: [...(pin.categories ?? [])],
    company: str(pin.company),
    companyWikiFor: str(pin.company),
    companyWikiUrl: str(pin.companyWikiUrl),
    address: str(pin.address),
    latitude: str(pin.latitude),
    longitude: str(pin.longitude),
    price: str(pin.price),
    priceCurrency: str(pin.priceCurrency),
    priceLowerBound: pin.priceLowerBound,
    priceUpperBound: pin.priceUpperBound,
    tip: pin.tip,
    dateConfidence: str(pin.dateConfidence),
    dateConfidenceReasoning: str(pin.dateConfidenceReasoning),
    originalStartDate: str(pin.originalStartDate),
    delayReasoning: str(pin.delayReasoning),
    merchants: pin.merchants ? pin.merchants.map((m) => ({ ...m })) : [],
    references: (pin.references || []).map(referenceToForm),
    media: pin.media || [],
    selectedMedia: pin.media?.[0],
    useMedia: true,
    extraMedia: (pin.media || []).slice(1),
    ratings: pin.ratings ? pin.ratings.map((r) => ({ ...r })) : [],
    // A stored pin's tickers are edited on its page, not here.
    stocks: [],
    awards: pin.awards ? pin.awards.map((a) => ({ ...a })) : [],
    tags: joinTags((pin.tags || []).filter((t) => t.source === 'user').map((t) => t.name)),
  };
}

// Fills the form's empty fields from a scrape, without overwriting what the
// author already typed or picked.
export function applyScrape(values: PinFormValues, scraped: ScrapedPin): PinFormValues {
  const next = { ...values };
  const fill = <K extends keyof PinFormValues>(key: K, value: PinFormValues[K] | undefined) => {
    if (value !== undefined && value !== '' && !next[key]) next[key] = value;
  };
  fill('title', scraped.title);
  fill('description', scraped.description);
  fill('longFormSummary', scraped.longFormSummary);
  if (!next.categories.length && scraped.categories?.length) next.categories = [...scraped.categories];
  if (!next.company && scraped.company) {
    next.company = scraped.company;
    next.companyWikiFor = scraped.company;
    next.companyWikiUrl = scraped.companyWikiUrl || '';
  }
  if (!next.address && scraped.address) {
    next.address = scraped.address;
    next.latitude = str(scraped.latitude);
    next.longitude = str(scraped.longitude);
  }
  if (!next.price && scraped.price != null) {
    next.price = str(scraped.price);
    next.priceCurrency = scraped.priceCurrency || next.priceCurrency;
  }
  if (!next.dateConfidence && scraped.dateConfidence) {
    next.dateConfidence = scraped.dateConfidence;
    next.dateConfidenceReasoning = scraped.dateConfidenceReasoning || '';
  }
  if (!next.originalStartDate && scraped.originalStartDate) {
    next.originalStartDate = scraped.originalStartDate;
    next.delayReasoning = scraped.delayReasoning || '';
  }
  if (!next.merchants.length && scraped.merchants?.length) {
    next.merchants = scraped.merchants.map((m) => ({ ...m }));
  }
  // References add to the list rather than fill it: a re-scrape can bring in
  // new ones next to those already typed, skipping any link already there.
  const listed = new Set(next.references.map((r) => r.url.trim()).filter(Boolean));
  const found = (scraped.references || []).filter((r) => r.url && r.url !== next.sourceUrl.trim() && !listed.has(r.url));
  if (found.length) {
    next.references = [...next.references.filter((r) => r.url.trim() || r.title.trim() || r.confidence.trim()), ...found.map(referenceToForm)];
  }
  if (!next.startDate && scraped.utcStartDateTime) {
    Object.assign(next, datesToForm({ utcStartDateTime: scraped.utcStartDateTime, utcEndDateTime: scraped.utcEndDateTime, allDay: scraped.allDay }), {
      allDay: !!scraped.allDay,
    });
  }
  if (!next.tags.trim() && scraped.tags?.length) {
    next.tags = joinTags(scraped.tags);
  }
  if (!next.awards.length && scraped.awards?.length) {
    next.awards = scraped.awards.map((a) => ({ ...a }));
  }
  if (!next.stocks.length && scraped.stocks?.length) {
    next.stocks = scraped.stocks.map((s) => ({ ...s }));
  }
  if (!next.ratings.length && scraped.ratings?.length) {
    next.ratings = scraped.ratings.map((r) => ({ ...r }));
  }
  if (scraped.trailer && !next.extraMedia.some((m) => m.originalUrl === scraped.trailer!.originalUrl)) {
    next.extraMedia = [...next.extraMedia, scraped.trailer];
  }
  if (scraped.media?.length) {
    next.media = scraped.media;
    next.selectedMedia = scraped.media.find((m) => m.originalUrl === values.selectedMedia?.originalUrl) || scraped.media[0];
  }
  return next;
}

const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? undefined : Number(v));

// The references worth sending: a link and a confidence each.
export function formToReferences(values: Pick<PinFormValues, 'references'>): PinReferenceJson[] {
  return values.references
    .filter((r) => r.url.trim() && num(r.confidence) !== undefined)
    .map(
      (r): PinReferenceJson => ({
        id: r.id,
        url: r.url.trim(),
        title: r.title.trim() || undefined,
        confidence: Math.min(100, Math.max(0, Math.round(num(r.confidence)!))),
        publishedDate: r.publishedDate || undefined,
        startDate: r.startDate || undefined,
        // An end before the start it goes with is not an end.
        endDate: r.endDate && !(r.startDate && r.endDate < r.startDate) ? r.endDate : undefined,
        reasoning: r.reasoning.trim() || undefined,
        utcCreatedDateTime: r.utcCreatedDateTime,
      }),
    );
}

// The dates the pin is saved with: the source's date fields, or the most
// confident reference's start and end where one outranks the source. When they
// differ, the source's own dates go along too so they are not lost.
export function formDates(values: PinFormValues) {
  const picked = pickDates(values, formToReferences(values), values.dateConfidence);
  const dates = formToDates({ ...values, ...picked });
  const source = formToDates(values);
  const overridden = dates.utcStartDateTime !== source.utcStartDateTime || dates.utcEndDateTime !== source.utcEndDateTime;
  return {
    dates: {
      ...dates,
      sourceStartDateTime: overridden ? source.utcStartDateTime : undefined,
      sourceEndDateTime: overridden ? source.utcEndDateTime : undefined,
    },
    overridden,
    startFrom: picked.startFrom,
    endFrom: picked.endFrom,
  };
}

// The request body for POST /api/pins or PUT /api/pins/:id.
export function formToPin(values: PinFormValues) {
  const company = values.company.trim();
  return {
    id: values.id,
    parentId: values.parentId,
    title: values.title.trim(),
    description: values.description || undefined,
    sourceUrl: values.sourceUrl.trim() || undefined,
    longFormSummary: values.longFormSummary || undefined,
    address: values.address.trim() || undefined,
    latitude: num(values.latitude),
    longitude: num(values.longitude),
    price: num(values.price),
    priceCurrency: values.priceCurrency.trim().toUpperCase() || undefined,
    priceLowerBound: values.priceLowerBound,
    priceUpperBound: values.priceUpperBound,
    tip: values.tip,
    dateConfidence: values.dateConfidence || undefined,
    dateConfidenceReasoning: values.dateConfidenceReasoning || undefined,
    originalStartDate: values.originalStartDate || undefined,
    delayReasoning: (values.originalStartDate && values.delayReasoning.trim()) || undefined,
    company: company || undefined,
    // A wiki link only travels with the company name it belongs to, so a
    // renamed company never inherits the old one's article.
    companyWikiUrl: company && company === values.companyWikiFor ? values.companyWikiUrl || undefined : undefined,
    categories: values.categories,
    allDay: values.allDay,
    ...formDates(values).dates,
    merchants: values.merchants
      .filter((m) => m.url || m.label)
      .map((m) => ({ id: m.id, label: m.label, url: m.url, price: m.price == null || (m.price as unknown) === '' ? undefined : Number(m.price) })),
    references: formToReferences(values),
    media: formToMedia(values),
    // Only saved when the pin is created; an edit leaves stored ratings alone.
    ratings: values.ratings,
    stocks: values.stocks.length ? values.stocks : undefined,
    tags: splitTags(values.tags),
  };
}

// The heading (when used) first, then the media kept alongside it. Choosing a
// different heading for a stored pin still replaces the old heading.
export function formToMedia(values: Pick<PinFormValues, 'useMedia' | 'selectedMedia' | 'extraMedia'>): MediumJson[] {
  const heading = values.useMedia && values.selectedMedia ? [values.selectedMedia] : [];
  return [...heading, ...values.extraMedia.filter((m) => !heading.some((h) => h.originalUrl === m.originalUrl))];
}
