// Marketplace listings (0095): a reader sells what a product pin is about,
// "Sell this item here" under its Buy on row, the way Facebook Marketplace
// lists one. The pin decides the kind - an item, a vehicle, a home or a job -
// and the form offers that kind alone. What each kind asks for is described
// here once, for the form, its preview and the API's checks.

export const LISTING_KINDS = ['item', 'vehicle', 'home', 'job'] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const LISTING_STATUSES = ['available', 'pending', 'sold'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// A pin sells as its product: a car, a house, a job or anything else. Only a
// pin that names one product (Pin.productName, 0085) has one to sell.
export function listingKindOf(pin: { productName?: string | null; categories?: string[] }): ListingKind | null {
  if (!pin.productName?.trim()) return null;
  const categories = new Set(pin.categories ?? []);
  if (categories.has('Automotive')) return 'vehicle';
  if (categories.has('Property')) return 'home';
  if (categories.has('Labour')) return 'job';
  return 'item';
}

export const ITEM_CATEGORIES = [
  'tools', 'furniture', 'household', 'garden', 'appliances', 'videoGames', 'books', 'moviesMusic', 'bags',
  'womensClothing', 'mensClothing', 'jewelry', 'health', 'pets', 'baby', 'toys', 'electronics', 'phones',
  'bicycles', 'crafts', 'sports', 'autoParts', 'instruments', 'antiques', 'misc',
] as const;

// The item category a pin's own category suggests, for the form to start on.
const ITEM_CATEGORY_FOR: Record<string, (typeof ITEM_CATEGORIES)[number]> = {
  Electronics: 'electronics',
  Computing: 'electronics',
  Audio: 'electronics',
  Telecom: 'phones',
  Gaming: 'videoGames',
  Literature: 'books',
  Manga: 'books',
  Sports: 'sports',
};

export function itemCategoryFor(categories: string[] | undefined): string | undefined {
  for (const c of categories ?? []) if (ITEM_CATEGORY_FOR[c]) return ITEM_CATEGORY_FOR[c];
  return undefined;
}

export type ListingField =
  | { name: string; type: 'select'; options: readonly string[]; required?: boolean }
  | { name: string; type: 'text'; max: number; required?: boolean; pattern?: RegExp }
  | { name: string; type: 'number'; min: number; max: number; step?: number; required?: boolean }
  | { name: string; type: 'multi'; options: readonly string[] }
  | { name: string; type: 'bool' };

const COLORS = ['black', 'white', 'gray', 'silver', 'red', 'blue', 'green', 'brown', 'beige', 'gold', 'orange', 'yellow', 'purple', 'other'] as const;
const NEXT_MODEL_YEAR = new Date().getUTCFullYear() + 1;

// What each kind keeps in Listing.details, in the order the form asks.
// Labels and option names are the listing.* messages.
export const DETAIL_FIELDS: Record<ListingKind, ListingField[]> = {
  item: [
    { name: 'category', type: 'select', options: ITEM_CATEGORIES, required: true },
    { name: 'condition', type: 'select', options: ['new', 'likeNew', 'good', 'fair'], required: true },
    { name: 'brand', type: 'text', max: 80 },
    { name: 'color', type: 'text', max: 40 },
  ],
  vehicle: [
    { name: 'vin', type: 'text', max: 17, pattern: /^[A-HJ-NPR-Z0-9]{17}$/i },
    { name: 'vehicleType', type: 'select', options: ['car', 'motorcycle', 'powersport', 'rv', 'trailer', 'boat', 'commercial', 'other'], required: true },
    { name: 'year', type: 'number', min: 1900, max: NEXT_MODEL_YEAR, required: true },
    { name: 'make', type: 'text', max: 40, required: true },
    { name: 'model', type: 'text', max: 60, required: true },
    { name: 'mileage', type: 'number', min: 0, max: 2_000_000 },
    { name: 'bodyStyle', type: 'select', options: ['coupe', 'truck', 'sedan', 'hatchback', 'suv', 'convertible', 'wagon', 'minivan', 'small', 'other'] },
    { name: 'exteriorColor', type: 'select', options: COLORS },
    { name: 'interiorColor', type: 'select', options: COLORS },
    { name: 'vehicleCondition', type: 'select', options: ['excellent', 'veryGood', 'good', 'fair', 'poor'] },
    { name: 'fuelType', type: 'select', options: ['gasoline', 'diesel', 'electric', 'hybrid', 'pluginHybrid', 'flex', 'other'] },
    { name: 'transmission', type: 'select', options: ['automatic', 'manual'] },
    { name: 'cleanTitle', type: 'bool' },
  ],
  home: [
    { name: 'offer', type: 'select', options: ['rent', 'sale'], required: true },
    { name: 'propertyType', type: 'select', options: ['apartment', 'condo', 'house', 'townhouse', 'room'], required: true },
    { name: 'bedrooms', type: 'number', min: 0, max: 50, required: true },
    { name: 'bathrooms', type: 'number', min: 0, max: 50, step: 0.5, required: true },
    { name: 'squareFeet', type: 'number', min: 1, max: 1_000_000 },
    { name: 'laundry', type: 'select', options: ['inUnit', 'inBuilding', 'available', 'none'] },
    { name: 'parking', type: 'select', options: ['garage', 'street', 'offStreet', 'available', 'none'] },
    { name: 'airConditioning', type: 'select', options: ['central', 'available', 'none'] },
    { name: 'heating', type: 'select', options: ['central', 'electric', 'gas', 'radiator', 'available', 'none'] },
  ],
  job: [
    { name: 'jobCategory', type: 'select', options: ['admin', 'beauty', 'construction', 'customerService', 'education', 'finance', 'food', 'healthcare', 'hospitality', 'it', 'maintenance', 'manufacturing', 'retail', 'sales', 'transportation', 'other'], required: true },
    { name: 'jobType', type: 'select', options: ['fullTime', 'partTime', 'contract', 'internship'], required: true },
    { name: 'payType', type: 'select', options: ['hourly', 'weekly', 'monthly', 'yearly'], required: true },
    { name: 'maxPay', type: 'number', min: 0, max: 10_000_000 },
    { name: 'locationType', type: 'select', options: ['onSite', 'remote', 'hybrid'], required: true },
    { name: 'benefits', type: 'multi', options: ['medical', 'dental', 'vision', 'retirement', 'overtime', 'tips'] },
  ],
};

// Photos per kind, as Marketplace allows; a job has one cover photo.
export const PHOTO_LIMIT: Record<ListingKind, number> = { item: 10, vehicle: 20, home: 50, job: 1 };
export const hasVideo = (kind: ListingKind) => kind !== 'job';
// A job may go without a picture; everything else is sold on one.
export const needsPhoto = (kind: ListingKind) => kind !== 'job';
// A vehicle and a home are named by their details, not a typed title.
export const hasTitleField = (kind: ListingKind) => kind === 'item' || kind === 'job';

export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 5000;
export const PRICE_MAX = 1_000_000_000;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;

export type ListingDetails = Record<string, string | number | boolean | string[]>;
export type ListingPlace = { latitude: number; longitude: number; name: string | null };

// What the form sends and the API keeps.
export type ListingInput = {
  title: string;
  price: number | null;
  description: string;
  details: ListingDetails;
  photos: string[];
  video: string | null;
  location: ListingPlace | null;
};

// A listing as the API sends it.
export type ListingJson = ListingInput & {
  id: number;
  pinId: number;
  kind: ListingKind;
  status: ListingStatus;
  currency: string;
  utcCreatedDateTime: string;
  utcUpdatedDateTime: string;
  seller: { id: number; userName: string; pictureUrl: string | null };
  sellerRating: RatingSummary;
  // The pin's title, on the seller's own list.
  pinTitle?: string;
  // Chats about it, on the seller's own list.
  chats?: number;
};

export type RatingSummary = { average: number | null; count: number };

// The name a vehicle goes by: "2019 Toyota Camry".
export function vehicleTitle(details: ListingDetails): string {
  return [details.year, details.make, details.model].filter((v) => v != null && v !== '').join(' ').trim();
}

// The title kept for a listing: the typed one, or for a vehicle and a home
// what its details make ("3 bed 2 bath house"; the page says it in the
// reader's language from the details).
export function storedTitle(kind: ListingKind, input: Pick<ListingInput, 'title' | 'details'>): string {
  if (kind === 'vehicle') return vehicleTitle(input.details);
  if (kind === 'home') return `${input.details.bedrooms} bed ${input.details.bathrooms} bath ${input.details.propertyType}`;
  return input.title.trim();
}

export type ListingProblem ={ field: string; code: 'required' | 'invalid' | 'tooLong' | 'tooMany' };

const blank = (v: unknown) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

// The first thing wrong with a listing of this kind, or undefined when it
// can be published. The form shows it by the field; the API refuses it.
export function listingProblem(kind: ListingKind, input: ListingInput): ListingProblem | undefined {
  if (hasTitleField(kind)) {
    if (blank(input.title)) return { field: 'title', code: 'required' };
    if (input.title.trim().length > TITLE_MAX) return { field: 'title', code: 'tooLong' };
  }
  if (input.price == null) return { field: 'price', code: 'required' };
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > PRICE_MAX) return { field: 'price', code: 'invalid' };
  if (kind === 'job' && blank(input.description)) return { field: 'description', code: 'required' };
  if (input.description.length > DESCRIPTION_MAX) return { field: 'description', code: 'tooLong' };
  for (const field of DETAIL_FIELDS[kind]) {
    const value = input.details[field.name];
    if (blank(value) || value === false) {
      if ('required' in field && field.required) return { field: field.name, code: 'required' };
      continue;
    }
    const bad =
      field.type === 'select'
        ? !field.options.includes(value as string)
        : field.type === 'text'
          ? typeof value !== 'string' || value.trim().length > field.max || (field.pattern ? !field.pattern.test(value.trim()) : false)
          : field.type === 'number'
            ? typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max || (value * 2) % ((field.step ?? 1) * 2) !== 0
            : field.type === 'multi'
              ? !Array.isArray(value) || value.some((v) => !field.options.includes(v))
              : typeof value !== 'boolean';
    if (bad) return { field: field.name, code: 'invalid' };
  }
  if (kind === 'job' && typeof input.details.maxPay === 'number' && input.details.maxPay < input.price) return { field: 'maxPay', code: 'invalid' };
  if (needsPhoto(kind) && !input.photos.length) return { field: 'photos', code: 'required' };
  if (input.photos.length > PHOTO_LIMIT[kind]) return { field: 'photos', code: 'tooMany' };
  if (input.video && !hasVideo(kind)) return { field: 'video', code: 'invalid' };
  if (!input.location) return { field: 'location', code: 'required' };
  return undefined;
}

// Only the fields the kind has, trimmed; blanks and false left out.
export function cleanDetails(kind: ListingKind, details: Record<string, unknown>): ListingDetails {
  const out: ListingDetails = {};
  for (const field of DETAIL_FIELDS[kind]) {
    const value = details[field.name];
    if (blank(value) || value === false) continue;
    if (typeof value === 'string') out[field.name] = field.type === 'text' && field.name === 'vin' ? value.trim().toUpperCase() : value.trim();
    else if (typeof value === 'number' || typeof value === 'boolean') out[field.name] = value;
    else if (Array.isArray(value)) out[field.name] = [...new Set(value.filter((v): v is string => typeof v === 'string'))];
  }
  return out;
}

// --- Ratings ---------------------------------------------------------------

// A turn is one side's run of messages; the chat about a listing has to go
// back and forth this many times before either side can rate the other.
export const RATING_TURNS = 7;
export const RATING_BODY_MAX = 750;
export const RATING_ROLES = ['seller', 'buyer'] as const;
export type RatingRole = (typeof RATING_ROLES)[number];

// What a rater can pick about a seller or a buyer: what went well at four
// or five stars, what could be better at three or fewer.
export const RATING_TAGS: Record<RatingRole, readonly string[]> = {
  seller: ['fairPricing', 'asDescribed', 'onTime', 'communication'],
  buyer: ['onTime', 'communication', 'payment', 'polite'],
};

// Turns in a run of messages, by their senders in order.
export function countTurns(senders: number[]): number {
  let turns = 0;
  let last: number | undefined;
  for (const sender of senders) {
    if (sender !== last) turns++;
    last = sender;
  }
  return turns;
}

export type RatingInput = { stars: number; tags: string[]; body: string };

export function ratingProblem(role: RatingRole, input: { stars?: unknown; tags?: unknown; body?: unknown }): string | undefined {
  if (!Number.isInteger(input.stars) || (input.stars as number) < 1 || (input.stars as number) > 5) return 'stars must be a whole number from 1 to 5';
  if (input.tags != null && (!Array.isArray(input.tags) || input.tags.some((tag) => !RATING_TAGS[role].includes(tag)))) {
    return `tags must be some of ${RATING_TAGS[role].join(', ')}`;
  }
  if (input.body != null && (typeof input.body !== 'string' || input.body.length > RATING_BODY_MAX)) return `body is at most ${RATING_BODY_MAX} characters`;
  return undefined;
}

// A listing a chat is about, as the chat's bar shows it: the rating opens
// once the turns reach RATING_TURNS.
export type ChatListing = {
  id: number;
  pinId: number;
  kind: ListingKind;
  title: string;
  price: number | null;
  currency: string;
  status: ListingStatus;
  photo: string | null;
  sellerId: number;
  // Turns since the first message about it, up to `throughMessageId`, and
  // who spoke last - the chat adds any newer messages itself.
  turns: number;
  throughMessageId: number;
  lastSenderId: number;
  // The viewer's rating of the other side over it, if given.
  myRating: (RatingInput & { role: RatingRole }) | null;
};
