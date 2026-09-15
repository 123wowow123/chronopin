// Converting between a pin and what its form edits. All-day pins are stored as
// whole UTC days (start 00:00Z of the first day, end 00:00Z of the day after
// the last, exclusive); the form works in the viewer's local calendar.

import { addDays, pickDates } from './dateClaims';
import type { MediumJson, MerchantJson, PinJson, PinRatingJson, PinReferenceJson } from './types';

// What /api/scrape answers: a draft pin, plus the promotional video it found
// for a film, series or anime (also listed in media).
export type ScrapedPin = Partial<PinJson> & { trailer?: MediumJson };

export type PinFormValues = {
  id?: number;
  parentId?: number;
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
  category: string;
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
  category: '',
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
  merchants: [],
  references: [],
  media: [],
  useMedia: true,
  extraMedia: [],
  ratings: [],
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const utcDate = (d: Date) => d.toISOString().slice(0, 10);

// The date fields for a pin. An all-day pin's exclusive end becomes its last
// day, and is dropped when that is the start day.
export function datesToForm(pin: Pick<PinJson, 'utcStartDateTime' | 'utcEndDateTime' | 'allDay'>) {
  const start = pin.utcStartDateTime ? new Date(pin.utcStartDateTime) : null;
  const end = pin.utcEndDateTime ? new Date(pin.utcEndDateTime) : null;
  if (pin.allDay) {
    const startDate = start ? utcDate(start) : '';
    let endDate = end ? addDays(utcDate(end), -1) : '';
    if (endDate && (!startDate || endDate <= startDate)) endDate = '';
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
    const start = `${values.startDate}T00:00:00.000Z`;
    const end = values.endDate && values.endDate > values.startDate ? `${addDays(values.endDate, 1)}T00:00:00.000Z` : undefined;
    return { utcStartDateTime: start, utcEndDateTime: end };
  }
  const toInstant = (date: string, time: string) => {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = (time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).toISOString();
  };
  const start = toInstant(values.startDate, values.startTime);
  const end = values.endDate ? toInstant(values.endDate, values.endTime) : undefined;
  return { utcStartDateTime: start, utcEndDateTime: end && end > start ? end : undefined };
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
    category: str(pin.category),
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
    merchants: pin.merchants ? pin.merchants.map((m) => ({ ...m })) : [],
    references: (pin.references || []).map(referenceToForm),
    media: pin.media || [],
    selectedMedia: pin.media?.[0],
    useMedia: true,
    extraMedia: (pin.media || []).slice(1),
    ratings: pin.ratings ? pin.ratings.map((r) => ({ ...r })) : [],
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
  fill('category', scraped.category);
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
    company: company || undefined,
    // A wiki link only travels with the company name it belongs to, so a
    // renamed company never inherits the old one's article.
    companyWikiUrl: company && company === values.companyWikiFor ? values.companyWikiUrl || undefined : undefined,
    category: values.category || undefined,
    allDay: values.allDay,
    ...formDates(values).dates,
    merchants: values.merchants
      .filter((m) => m.url || m.label)
      .map((m) => ({ id: m.id, label: m.label, url: m.url, price: m.price == null || (m.price as unknown) === '' ? undefined : Number(m.price) })),
    references: formToReferences(values),
    media: formToMedia(values),
    // Only saved when the pin is created; an edit leaves stored ratings alone.
    ratings: values.ratings,
  };
}

// The heading (when used) first, then the media kept alongside it. Choosing a
// different heading for a stored pin still replaces the old heading.
export function formToMedia(values: Pick<PinFormValues, 'useMedia' | 'selectedMedia' | 'extraMedia'>): MediumJson[] {
  const heading = values.useMedia && values.selectedMedia ? [values.selectedMedia] : [];
  return [...heading, ...values.extraMedia.filter((m) => !heading.some((h) => h.originalUrl === m.originalUrl))];
}
