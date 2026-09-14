// Converting between a pin and what its form edits. All-day pins are stored as
// whole UTC days (start 00:00Z of the first day, end 00:00Z of the day after
// the last, exclusive); the form works in the viewer's local calendar.

import type { MediumJson, MerchantJson, PinJson, PinReferenceJson } from './types';

export type PinFormValues = {
  id?: number;
  parentId?: number;
  sourceUrl: string;
  title: string;
  description: string;
  longFormSummary: string;
  allDay: boolean;
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
};

// A reference row as typed: confidence stays a string until it is sent.
export type ReferenceFormValues = Omit<PinReferenceJson, 'confidence' | 'title' | 'publishedDate'> & {
  title: string;
  confidence: string;
  publishedDate: string;
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
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const utcDate = (d: Date) => d.toISOString().slice(0, 10);

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

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
    ...datesToForm(pin),
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
  };
}

// Fills the form's empty fields from a scrape, without overwriting what the
// author already typed or picked.
export function applyScrape(values: PinFormValues, scraped: Partial<PinJson>): PinFormValues {
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
  if (scraped.media?.length) {
    next.media = scraped.media;
    next.selectedMedia = scraped.media.find((m) => m.originalUrl === values.selectedMedia?.originalUrl) || scraped.media[0];
  }
  return next;
}

const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? undefined : Number(v));

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
    ...formToDates(values),
    merchants: values.merchants
      .filter((m) => m.url || m.label)
      .map((m) => ({ id: m.id, label: m.label, url: m.url, price: m.price == null || (m.price as unknown) === '' ? undefined : Number(m.price) })),
    references: values.references
      .filter((r) => r.url.trim() && num(r.confidence) !== undefined)
      .map(
        (r): PinReferenceJson => ({
          id: r.id,
          url: r.url.trim(),
          title: r.title.trim() || undefined,
          confidence: Math.min(100, Math.max(0, Math.round(num(r.confidence)!))),
          publishedDate: r.publishedDate || undefined,
          utcCreatedDateTime: r.utcCreatedDateTime,
        }),
      ),
    media: values.useMedia && values.selectedMedia ? [values.selectedMedia] : [],
  };
}
