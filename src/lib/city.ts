import { US_STATES } from './usStates';

// The city a pin stands in, read off its address line, for the trending and
// new pins rows' city pill.
//
// A pin has no geocoded city (see src/server/util/placeMatch.ts): its address
// is one line, from the most particular part to the least, written by hand or
// by a reverse geocoder ("Anthropic, 500 Howard Street, San Francisco, CA",
// "Etsy, Inc., 117, Adams Street, Dumbo, Brooklyn, Kings County, New York,
// 11201, United States"). So the parts are walked from the end: the country,
// postcodes, states, provinces and counties are passed over, and the first
// part left is the city. A line that runs out first ("New South Wales,
// Australia"), or reaches a street or a description ("Point of greatest
// eclipse at sea, off Chile") before any city, has none.
//
// Telling a province from a city takes knowing it, so the areas are a list,
// grown from the addresses pins carry; one missing from it shows as the pin's
// city until it is added. Cities that share a name with their province or
// state (Tokyo, São Paulo, Hamburg, Salzburg) are left off it on purpose.

// Country names Intl.DisplayNames gives in none of the languages below.
const COUNTRY_ALIASES = [
  'USA', 'US', 'U.S.', 'U.S.A.', 'United States of America', 'UK', 'U.K.', 'Great Britain', 'Britain',
  'Turkey', 'Turkiye', 'Czech Republic', 'Burma', 'Ivory Coast', 'Korea', "People's Republic of China", 'PRC',
  'Russian Federation', 'UAE', 'Holland', 'Vatican', 'Palestine', 'Metropolitan France', 'Mainland Finland',
  'La Réunion', 'Mainland China',
  // The UK's nations stand where a country does: "Rayleigh, Essex, England, UK".
  'England', 'Scotland', 'Wales', 'Northern Ireland',
];

// Languages whose names for countries an address may use ("Norge",
// "Deutschland"): Nominatim names a country in its own language.
const COUNTRY_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'da', 'nb', 'sv', 'fi', 'is', 'pl', 'cs', 'sk', 'hu', 'ro', 'el', 'tr', 'ru', 'uk', 'tg', 'mn', 'ja', 'zh', 'ko', 'ar'];

// Countries that are one city: the country is the city.
const CITY_STATES = new Map(
  [['Singapore'], ['Hong Kong'], ['香港', 'Hong Kong'], ['澳門', 'Macao'], ['澳门', 'Macao'], ['Hong Kong SAR China', 'Hong Kong'], ['Macao'], ['Macau', 'Macao'], ['Macao SAR China', 'Macao'], ['Monaco'], ['Vatican City'], ['Vatican', 'Vatican City']].map(
    ([name, city]) => [name.toLowerCase(), city ?? name],
  ),
);

// States, provinces, regions and counties an address names between the city
// and the country, besides the US states (usStates.ts) and the ones AREA
// names by their shape.
const AREAS = [
  // Canada, Australia
  'Golden Horseshoe', 'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario',
  'Prince Edward Island', 'Quebec', 'Québec', 'Saskatchewan', 'Yukon', 'Nunavut', 'Northwest Territories',
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'YT', 'NU', 'NT',
  'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania',
  'Australian Capital Territory', 'Northern Territory', 'NSW', 'VIC', 'QLD', 'TAS', 'ACT', 'WA', 'SA',
  // United Kingdom, Ireland
  'Essex', 'Kent', 'Surrey', 'Sussex', 'East Sussex', 'West Sussex',
  'Norfolk', 'Suffolk', 'Somerset', 'Devon', 'Cornwall', 'Dorset', 'Cumbria', 'Merseyside', 'Greater Manchester',
  'West Midlands', 'West Yorkshire', 'South Yorkshire', 'North Yorkshire', 'East Riding of Yorkshire', 'Tyne and Wear',
  'Northumberland', 'Middlesex', 'Rutland', 'Isle of Wight', 'Highland', 'Fife', 'Midlothian', 'Orkney', 'Shetland',
  'Cambridgeshire and Peterborough', 'Leinster', 'Munster', 'Connacht', 'Ulster',
  // Germany, Austria, Switzerland
  'Baden-Württemberg', 'Bavaria', 'Bayern', 'Brandenburg', 'Hesse', 'Hessen', 'Lower Saxony', 'Niedersachsen',
  'Mecklenburg-Vorpommern', 'Mecklenburg-Western Pomerania', 'North Rhine-Westphalia', 'Nordrhein-Westfalen',
  'Rhineland-Palatinate', 'Rheinland-Pfalz', 'Saarland', 'Saxony', 'Sachsen', 'Saxony-Anhalt', 'Sachsen-Anhalt',
  'Schleswig-Holstein', 'Thuringia', 'Thüringen', 'Styria', 'Steiermark', 'Tyrol', 'Tirol', 'Carinthia', 'Kärnten',
  'Upper Austria', 'Lower Austria', 'Vorarlberg', 'Burgenland', 'Uri', 'Valais', 'Wallis', 'Ticino', 'Graubünden',
  'Vaud', 'Aargau', 'Thurgau', 'Obwalden', 'Nidwalden', 'Glarus', 'Bernese Alps',
  // France
  'Île-de-France', 'Ile-de-France', "Provence-Alpes-Côte d'Azur", 'Auvergne-Rhône-Alpes', 'Occitanie', 'Occitania',
  'Nouvelle-Aquitaine', 'Hauts-de-France', 'Grand Est', 'Brittany', 'Bretagne', 'Normandy', 'Normandie',
  'Pays de la Loire', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté', 'Corsica', 'Grand Paris', 'Gironde', 'Somme',
  'Marne', 'Vendée', 'Savoie', 'Haute-Savoie', 'Yvelines', 'Aveyron', 'Seine-Saint-Denis', 'Hauts-de-Seine',
  'Val-de-Marne', 'Bouches-du-Rhône', 'Alpes-Maritimes', 'Var', 'Rhône', 'Loire-Atlantique', 'Haute-Garonne',
  'Bas-Rhin', 'Haut-Rhin', 'Essonne', 'Seine-et-Marne', "Val-d'Oise", 'Vienne', 'Ouest',
  // Italy, Spain, Portugal
  'Lombardy', 'Lombardia', 'Piedmont', 'Piemonte', 'Veneto', 'Tuscany', 'Toscana', 'Lazio', 'Campania', 'Sicily',
  'Sicilia', 'Sardinia', 'Sardegna', 'Emilia-Romagna', 'Liguria', 'Apulia', 'Puglia', 'Calabria', 'Abruzzo', 'Marche',
  'Umbria', 'Friuli-Venezia Giulia', 'Friuli Venezia Giulia', 'Trentino-Alto Adige', 'South Tyrol', 'Basilicata',
  'Molise', 'Aosta Valley', "Valle d'Aosta", 'Catalonia', 'Cataluña', 'Catalunya', 'Andalusia', 'Andalucía',
  'Aragón', 'Aragon', 'Basque Country', 'País Vasco', 'Euskadi', 'Bizkaia', 'Biscay', 'Gipuzkoa', 'Castilla-La Mancha',
  'Castile and León', 'Castilla y León', 'Galicia', 'Valencian Community', 'Canary Islands', 'Balearic Islands',
  'Asturias', 'Cantabria', 'Navarre', 'Navarra', 'Extremadura', 'La Rioja', 'Madeira', 'Azores', 'Algarve',
  // Benelux, the Nordics, central and eastern Europe
  'North Holland', 'Noord-Holland', 'South Holland', 'Zuid-Holland', 'North Brabant', 'Noord-Brabant', 'Gelderland',
  'Overijssel', 'Limburg', 'Friesland', 'Fryslân', 'Drenthe', 'Flevoland', 'Zeeland', 'Flanders', 'Wallonia',
  'East Flanders', 'West Flanders', 'Rogaland', 'Agder', 'Vestland', 'Viken', 'Innlandet', 'Trøndelag', 'Nordland',
  'Troms', 'Finnmark', 'Møre og Romsdal', 'Kymenlaakso', 'Uusimaa', 'Pirkanmaa', 'Satakunta', 'Västra Götaland',
  'Skåne', 'Scania', 'Hovedstaden', 'Central Hungary', 'Attica', 'Central Macedonia', 'Crimea',
  // Asia
  'Anhui', 'Fujian', 'Gansu', 'Guangdong', 'Guangxi', 'Guizhou', 'Hainan', 'Hebei', 'Heilongjiang', 'Henan', 'Hubei',
  'Hunan', 'Inner Mongolia', 'Jiangsu', 'Jiangxi', 'Liaoning', 'Ningxia', 'Qinghai', 'Shaanxi', 'Shandong', 'Shanxi',
  'Sichuan', 'Tibet', 'Xinjiang', 'Yunnan', 'Zhejiang', 'New Territories', 'Kowloon',
  'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttarakhand', 'West Bengal', 'Jammu and Kashmir', 'Ladakh',
  'Hokkaido', 'Iwate', 'Miyagi', 'Ibaraki', 'Tochigi', 'Gunma', 'Kanagawa', 'Ishikawa', 'Yamanashi', 'Aichi', 'Mie',
  'Shiga', 'Hyogo', 'Hyōgo', 'Shimane', 'Kagawa', 'Ehime', 'Okinawa', 'Gyeonggi', 'Johor', 'Penang', 'Selangor',
  'Sabah', 'Sarawak', 'Perak', 'Kedah', 'Pahang', 'Maluku', 'Lampung', 'Banten', 'West Java', 'Central Java',
  'East Java', 'West Nusa Tenggara', 'East Nusa Tenggara', 'Central Luzon', 'Eastern Samar', 'Bulacan', 'Metro Manila',
  'Calabarzon', 'Ömnögovi',
  // The Americas, Africa
  'Quintana Roo', 'Jalisco', 'Nuevo León', 'Baja California', 'Baja California Sur', 'Sonora', 'Yucatán', 'Yucatan',
  'Santa Catarina', 'Rio Grande do Sul', 'Minas Gerais', 'Paraná', 'Bahia', 'Pernambuco', 'Ceará', 'Goiás',
  'Amazonas', 'Pará', 'Espírito Santo', 'Antioquia', 'Cundinamarca', 'Ancash', 'Los Ríos', 'Los Rios', 'Panamá Oeste',
  'Beheira', 'Oromia', 'Amhara', 'Tigray', 'Benishangul-Gumuz', 'Northern Cape', 'Western Cape', 'Eastern Cape',
  'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Free State',
];

// Areas that are also cities in another province: after one, the city.
const AREAS_AND_CITIES = new Set(['victoria', 'surrey']);

// Regions that stand for their city.
const AREA_CITIES = new Map([['greater london', 'London']]);

// An area wider than a city, by the shape of its name: "Kings County",
// "Aberdeenshire", "Krasnoyarsk Krai", "County Limerick", "Canton of
// Basel-Stadt", "Gyeongsangnam-do", "Uttar Pradesh".
const AREA =
  /\s(County|Prefecture|Province|Region|Oblast|Krai|Raion|Voivodeship|Governorate|Parish|Territory|Municipality|District|Emirate|Department|kommun|Kommune|Autonomous Region|Autonomous Community|State|Subdistrict|sub-region)$|shire$|kreis$|-do$|\sPradesh$|(省|自治区|自治州|自治县|县|縣|県)$|^(County|Canton|Community|State|Province|Region|Arrondissement|Municipal District|Department|Republic) of\s|^(County|Region|Região|VVG)\s/i;

// A part that is a street: the city was not given, since everything before
// it is more particular still.
const STREET =
  /\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Parkway|Pkwy|Highway|Hwy|Way|Court|Ct|Plaza|Pike)\.?$|(straße|strasse|weg|plein|laan|gatan|vägen|veien|gata)$|^(Avenue|Rue|Via|Calle|Praça|Praca|Broadway)\b/i;

const countries: Record<'english' | 'any', Set<string> | undefined> = { english: undefined, any: undefined };

// Every country's name (from Intl, so the list keeps up by itself) and the
// aliases, lower case: in English, or in any of the languages above. Built on
// first use.
function countryNames(languages: 'english' | 'any'): Set<string> {
  const built = countries[languages];
  if (built) return built;
  const names = new Set(COUNTRY_ALIASES.map((name) => name.toLowerCase()));
  for (const language of languages === 'english' ? ['en'] : COUNTRY_LANGUAGES) {
    const display = new Intl.DisplayNames([language], { type: 'region', fallback: 'none' });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const name = display.of(String.fromCharCode(a, b));
        if (name) names.add(name.toLowerCase());
      }
    }
  }
  return (countries[languages] = names);
}

// Only an address's last part is looked for in every language: a city can
// share its name with a country in another one (Finnish calls Brazil
// "Brasilia").
function isCountry(lower: string, last: boolean): boolean {
  return countryNames(last ? 'any' : 'english').has(lower.replace(/^(the|republic of|federated states of)\s+/, ''));
}

const US_STATE_BY_NAME = new Map(US_STATES.map(([name, code]) => [name.toLowerCase(), code]));
const US_STATE_BY_CODE = new Map(US_STATES.map(([name, code]) => [code.toLowerCase(), name]));
const AREA_NAMES = new Set(AREAS.map((name) => name.toLowerCase()));
// A region of a US state named after it: "Middle Tennessee", "Upstate New York".
const REGION_OF = /^(north|south|east|west|middle|central|upstate|downstate|northern|southern|eastern|western)\s+/;

// A part without the postcode, state code or note it carries: "London SE1
// 9SP", "77977 Rust", "1017 XH Amsterdam", "DK-5330 Munkebo", "Melbourne VIC
// 3000", "Oslo 0161", "London W1F", "Sant'Agata Bolognese (BO)".
function withoutCodes(part: string): string {
  return part
    .replace(/\s*\([^)]*\)?/g, '')
    .replace(/^(?:[A-Z]{1,2}-)?\d{3,6}(?:-\d{3,4})?(?:\s?[A-Z]{2}(?=\s))?\s+/, '')
    .replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '')
    .replace(/\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, '')
    .replace(/\s+\d{3,6}(-\d{3,4})?$/, '')
    .replace(/\s+[A-Z]{1,2}\d{1,2}[A-Z]?$/, '')
    .replace(/\s+(VIC|NSW|QLD|TAS|ACT|NT|WA|SA)$/, '')
    .replace(/\s+[A-Z]{2}$/, (code) => (US_STATE_BY_CODE.has(code.trim().toLowerCase()) ? '' : code))
    .trim();
}

// A postcode on its own: "11201", "CB2 1ST", "D02 F798", "M5G 1E2".
function isPostcode(part: string): boolean {
  return /^[\d\s-]+$/.test(part) || (/\d/.test(part) && !/\p{Ll}/u.test(part) && /^[A-Z\d]{2,4}\s?[A-Z\d]{3,4}$/.test(part));
}

// The name of the US state a part is, by name or code (DC reads as
// Washington, the city it is), else undefined.
function usStateOf(part: string): string | undefined {
  const lower = part.replace(/\./g, '').toLowerCase();
  if (lower === 'dc' || lower === 'district of columbia') return 'Washington';
  if (US_STATE_BY_NAME.has(lower)) return part;
  return US_STATE_BY_CODE.get(lower);
}

export function cityOf(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address
    .replace(/\([^)]*\)/g, '')
    .split(',')
    .map((part) => withoutCodes(part.trim()))
    .filter(Boolean);
  // The country, state or area passed over last: a part before it with the
  // same name is its city ("New York, NY", "Saitama, Saitama", "Luxembourg,
  // Luxembourg", "Washington, DC").
  let passed: string | undefined;
  // In a US address the part before the state is the city, whatever else
  // shares its name ("New Brunswick, New Jersey"), bar the counties and
  // regions of that state ("Middle Tennessee, Tennessee").
  let usState: string | undefined;
  // Whether a province has been passed: then an area named like a city
  // elsewhere is that city ("Victoria, British Columbia").
  let area = false;
  for (let at = parts.length - 1; at >= 0; at--) {
    const part = parts[at];
    const lower = part.toLowerCase();
    if (passed && lower === passed.toLowerCase()) return part;
    if (CITY_STATES.has(lower)) return CITY_STATES.get(lower)!;
    if (isPostcode(part)) continue;
    if (!usState && isCountry(lower, at === parts.length - 1)) {
      passed = part;
      continue;
    }
    const state = usStateOf(part);
    if (state) {
      passed = usState = state;
      continue;
    }
    if (AREA_CITIES.has(lower)) return AREA_CITIES.get(lower)!;
    if (AREA.test(part) || (usState ? lower.replace(REGION_OF, '') === usState.toLowerCase() : AREA_NAMES.has(lower) && !(area && AREAS_AND_CITIES.has(lower)))) {
      passed = part;
      area = true;
      continue;
    }
    if (STREET.test(part)) return null;
    // A house number before a district ("3-31-1 Nakano") is not part of it.
    // Nor is "downtown", "near" or "City of" before a city.
    const name = part.replace(/^[\d-]+[A-Za-z]?\s+/, '').replace(/^(downtown|near|City of)\s+/i, '');
    // A description, not a name: lower case ("off Chile") or a phrase.
    if (/^\p{Ll}/u.test(name) || name.split(/\s+/).length > 4) return null;
    return name;
  }
  return null;
}
