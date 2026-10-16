// Travel and resort guide data: curated luxury resorts, hotels, and retreats
// ranked on the Chronopin hotel rubric (PinHotel, 0174), paired with
// comprehensive destination climate and "best time to go" seasonal intelligence.

import { distanceKm, type Place } from './distance';
import type { PinHotelJson } from './pinHotel';
import type { PinJson } from './types';

export const MIN_INDEXED_RESORTS = 8;
export const RESORTS_SHELF_SIZE = 24;

export type MonthStatus = 'prime' | 'good' | 'fair' | 'avoid';

export type MonthWeather = {
  month: number; // 1 - 12
  label: string; // 'Jan', 'Feb', etc.
  status: MonthStatus;
  tempC: number;
  rainfall: 'Low' | 'Moderate' | 'High';
  highlight?: string;
};

export type BestTimeToGo = {
  recommendedMonths: number[]; // 1 - 12
  bestSeason: string;
  peakSeason: string;
  shoulderSeason: string;
  lowSeason: string;
  tempRange: string;
  weatherSummary: string;
  whyGo: string;
  climateZone: string;
  months: MonthWeather[];
};

export type PricePerNight = {
  amount: number;
  maxAmount?: number;
  currency: string;
  formatted: string;
  isRange?: boolean;
};

export type ActivityCategory =
  | 'Culture'
  | 'Wellness'
  | 'Adventure'
  | 'Water'
  | 'Nature'
  | 'Dining'
  | 'Snow'
  | 'Kids';

export type ResortActivity = {
  title: string;
  category: ActivityCategory;
  season?: string;
  description: string;
  kidsFriendly?: boolean;
};

export type TravelResortPin = PinJson & {
  hotel: PinHotelJson;
  rubricScore: number;
  acclaimLabel?: string;
  destination: string;
  bestTimeToGo: BestTimeToGo;
  pricePerNight?: PricePerNight;
  topActivities?: ResortActivity[];
};

export type TravelShelf = {
  id: string;
  name: string;
  label: string;
  tagline: string;
  pins: TravelResortPin[];
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const TRAVEL_SEASONS = [
  { id: 'all', label: 'All Year', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: 'spring', label: 'Spring (Mar – May)', months: [3, 4, 5] },
  { id: 'summer', label: 'Summer (Jun – Aug)', months: [6, 7, 8] },
  { id: 'autumn', label: 'Autumn (Sep – Nov)', months: [9, 10, 11] },
  { id: 'winter', label: 'Winter (Dec – Feb)', months: [12, 1, 2] },
] as const;

function buildMonths(
  ratings: Record<number, { status: MonthStatus; tempC: number; rainfall: 'Low' | 'Moderate' | 'High'; highlight?: string }>,
): MonthWeather[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const r = ratings[month] ?? { status: 'fair', tempC: 20, rainfall: 'Moderate' };
    return {
      month,
      label: MONTH_NAMES[i],
      status: r.status,
      tempC: r.tempC,
      rainfall: r.rainfall,
      highlight: r.highlight,
    };
  });
}

// Destination and seasonal timing repository for all curated resorts and hotels.
const RESORT_TIMING_MAP: Record<number, { destination: string; timing: BestTimeToGo }> = {
  // Capella Kyoto
  15302: {
    destination: 'Higashiyama, Kyoto, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Spring Cherry Blossoms & Autumn Maple Foliage',
      peakSeason: 'Late March to May, October to November',
      shoulderSeason: 'June, September, early December',
      lowSeason: 'July to August (heavy basin humidity & heat), January to February',
      tempRange: '14°C – 23°C (57°F – 73°F)',
      weatherSummary: 'Crisp, sunny days with low rainfall and vibrant foliage throughout Higashiyama.',
      whyGo: 'Kyoto’s historic stone-paved lanes and wooden machiya are in full glory during early April sakura and late November momiji. Spring brings the famed Miyako Odori geiko dances, while autumn bathes the temple gardens in vivid crimson and gold. Summers are notoriously hot and humid.',
      climateZone: 'Temperate Kansai Basin',
      months: buildMonths({
        1: { status: 'fair', tempC: 9, rainfall: 'Low', highlight: 'Quiet winter' },
        2: { status: 'fair', tempC: 10, rainfall: 'Low', highlight: 'Plum blossoms' },
        3: { status: 'prime', tempC: 14, rainfall: 'Moderate', highlight: 'Early sakura' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Peak cherry blossoms' },
        5: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Lush green tea' },
        6: { status: 'good', tempC: 28, rainfall: 'High', highlight: 'Hydrangeas' },
        7: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Gion Matsuri heat' },
        8: { status: 'avoid', tempC: 34, rainfall: 'Moderate', highlight: 'High humidity' },
        9: { status: 'good', tempC: 29, rainfall: 'High', highlight: 'Pleasant evenings' },
        10: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Clear crisp days' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Peak autumn maple' },
        12: { status: 'good', tempC: 12, rainfall: 'Low', highlight: 'Temple illuminations' },
      }),
    },
  },

  // Amoh, a Luxury Collection Resort, Rhodes
  15289: {
    destination: 'Pefkos, Rhodes, Greece',
    timing: {
      recommendedMonths: [5, 6, 9, 10],
      bestSeason: 'Warm Aegean Waters & Golden Shoulder Sun',
      peakSeason: 'July to August (peak summer beach crowds)',
      shoulderSeason: 'May to June, September to October',
      lowSeason: 'November to April (cool, many island venues closed)',
      tempRange: '23°C – 28°C (73°F – 82°F)',
      weatherSummary: 'Glorious Mediterranean sunshine, calm seas, and refreshing coastal breezes.',
      whyGo: 'May and June bring 14 daily hours of sunshine and blooming wildflowers without the 38°C midday heat of high summer. September and October retain the year’s warmest sea temperatures (25°C) and romantic golden sunsets after the bulk of tourist cruises depart.',
      climateZone: 'Aegean Mediterranean',
      months: buildMonths({
        1: { status: 'avoid', tempC: 15, rainfall: 'High', highlight: 'Winter storms' },
        2: { status: 'avoid', tempC: 15, rainfall: 'Moderate', highlight: 'Quiet season' },
        3: { status: 'fair', tempC: 17, rainfall: 'Moderate', highlight: 'Spring bloom' },
        4: { status: 'good', tempC: 20, rainfall: 'Low', highlight: 'Greek Easter' },
        5: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Pristine swimming' },
        6: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Long sunny days' },
        7: { status: 'good', tempC: 32, rainfall: 'Low', highlight: 'Peak beach energy' },
        8: { status: 'good', tempC: 32, rainfall: 'Low', highlight: 'Warm sea' },
        9: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Warmest water (25°C)' },
        10: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Golden shoulder sun' },
        11: { status: 'fair', tempC: 20, rainfall: 'High', highlight: 'End of season' },
        12: { status: 'avoid', tempC: 16, rainfall: 'High', highlight: 'Winter rain' },
      }),
    },
  },

  // COMO Le Beauvallon
  15293: {
    destination: 'Bay of Saint-Tropez, French Riviera, France',
    timing: {
      recommendedMonths: [5, 6, 9, 10],
      bestSeason: 'Côte d’Azur Shoulder Glamour & Yachting',
      peakSeason: 'July to August (bustling beach clubs and high traffic)',
      shoulderSeason: 'May to June, September to October',
      lowSeason: 'November to March (quiet off-season)',
      tempRange: '22°C – 27°C (72°F – 81°F)',
      weatherSummary: 'Sunny Mediterranean warmth with mild sea breezes across Grimaud and Saint-Tropez.',
      whyGo: 'Late spring and early autumn grant effortless private boat transfers across the gulf and relaxed table reservations at Club 55, avoiding the legendary coastal traffic gridlock of midsummer while revelling in perfect Mediterranean climate.',
      climateZone: 'Coastal Mediterranean',
      months: buildMonths({
        1: { status: 'avoid', tempC: 13, rainfall: 'Moderate' },
        2: { status: 'avoid', tempC: 14, rainfall: 'Moderate', highlight: 'Mimosa festival' },
        3: { status: 'fair', tempC: 16, rainfall: 'Moderate' },
        4: { status: 'good', tempC: 18, rainfall: 'Moderate', highlight: 'Spring sailing' },
        5: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Cannes & Grand Prix' },
        6: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Idyllic beach clubs' },
        7: { status: 'good', tempC: 30, rainfall: 'Low', highlight: 'High summer glitz' },
        8: { status: 'good', tempC: 30, rainfall: 'Low', highlight: 'Yachting season' },
        9: { status: 'prime', tempC: 26, rainfall: 'Moderate', highlight: 'Les Voiles de St-Tropez' },
        10: { status: 'good', tempC: 21, rainfall: 'High', highlight: 'Wine harvest' },
        11: { status: 'avoid', tempC: 16, rainfall: 'High' },
        12: { status: 'avoid', tempC: 13, rainfall: 'Moderate' },
      }),
    },
  },

  // The St. Regis Costa Mujeres Resort, Cancún
  15275: {
    destination: 'Costa Mujeres, Quintana Roo, Mexico',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 4],
      bestSeason: 'Caribbean Dry Season & Crystal Turquoise Waters',
      peakSeason: 'Christmas through Easter (December to April)',
      shoulderSeason: 'May, November',
      lowSeason: 'June to October (rainy season & tropical storm risk)',
      tempRange: '26°C – 29°C (79°F – 84°F)',
      weatherSummary: 'Consistent sunny skies, low humidity, zero sargassum risk, and calm Caribbean seas.',
      whyGo: 'Winter and early spring deliver cloudless skies, calm waters ideal for catamaran sailing to Isla Mujeres, and zero risk of seaweed or hurricane disruptions. Late summer brings high humidity and tropical afternoon downpours.',
      climateZone: 'Tropical Maritime',
      months: buildMonths({
        1: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Ideal winter sun' },
        2: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Low humidity' },
        3: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Crystal calm seas' },
        4: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Warm beach days' },
        5: { status: 'good', tempC: 32, rainfall: 'Moderate', highlight: 'Warm swimming' },
        6: { status: 'fair', tempC: 33, rainfall: 'High', highlight: 'Summer heat' },
        7: { status: 'fair', tempC: 33, rainfall: 'Moderate', highlight: 'Whale sharks' },
        8: { status: 'avoid', tempC: 33, rainfall: 'High', highlight: 'Tropical storms' },
        9: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Peak rain' },
        10: { status: 'fair', tempC: 31, rainfall: 'High', highlight: 'Storm risk' },
        11: { status: 'good', tempC: 29, rainfall: 'Moderate', highlight: 'Shoulder value' },
        12: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Festive season' },
      }),
    },
  },

  // Four Seasons Hotel and Residences Cartagena
  15274: {
    destination: 'Getsemaní, Cartagena de Indias, Colombia',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 4],
      bestSeason: 'Verano Dry Season & Coastal Caribbean Trade Winds',
      peakSeason: 'December to April',
      shoulderSeason: 'July, August',
      lowSeason: 'September to November (heavy tropical rains)',
      tempRange: '28°C – 31°C (82°F – 88°F)',
      weatherSummary: 'Constant trade winds temper equatorial heat; sunny skies and vibrant colonial street life.',
      whyGo: 'Cartagena’s "verano" season features breezy Caribbean trade winds that make exploring the 16th-century fortress walls and lively plazas of Getsemaní delightful. October is the rainiest month with heavy late-afternoon downpours.',
      climateZone: 'Tropical Coastal',
      months: buildMonths({
        1: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Cartagena Music Festival' },
        2: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Breezy trade winds' },
        3: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Dry & sun-drenched' },
        4: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Pleasant evenings' },
        5: { status: 'fair', tempC: 32, rainfall: 'Moderate' },
        6: { status: 'fair', tempC: 32, rainfall: 'Moderate' },
        7: { status: 'good', tempC: 32, rainfall: 'Moderate', highlight: 'Summer mini-verano' },
        8: { status: 'good', tempC: 32, rainfall: 'Moderate' },
        9: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Rainy season' },
        10: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Peak downpours' },
        11: { status: 'fair', tempC: 31, rainfall: 'Moderate', highlight: 'Independence fest' },
        12: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Festive lights' },
      }),
    },
  },

  // Four Seasons Hotel Mykonos
  15295: {
    destination: 'Kalo Livadi, Mykonos, Greece',
    timing: {
      recommendedMonths: [5, 6, 9],
      bestSeason: 'Aegean Summer & Beach Club Sunset Chilling',
      peakSeason: 'July to August (peak parties, full beaches, high winds)',
      shoulderSeason: 'May to June, September',
      lowSeason: 'October to April (island hibernation)',
      tempRange: '23°C – 28°C (73°F – 82°F)',
      weatherSummary: 'Clear Cycladic blue skies, vibrant turquoise seas, and golden Aegean sunsets.',
      whyGo: 'May, June, and September offer the ideal combination: warm sea temperatures, open beach clubs, and serene coastal dining at Kalo Livadi without peak July-August crowds, exorbitant surge rates, or the fierce Meltemi gale winds.',
      climateZone: 'Cycladic Mediterranean',
      months: buildMonths({
        1: { status: 'avoid', tempC: 14, rainfall: 'High' },
        2: { status: 'avoid', tempC: 14, rainfall: 'Moderate' },
        3: { status: 'fair', tempC: 16, rainfall: 'Moderate' },
        4: { status: 'good', tempC: 19, rainfall: 'Low', highlight: 'Spring waking' },
        5: { status: 'prime', tempC: 23, rainfall: 'Low', highlight: 'Opening parties' },
        6: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Perfect swimming' },
        7: { status: 'good', tempC: 30, rainfall: 'Low', highlight: 'Peak beach energy' },
        8: { status: 'good', tempC: 30, rainfall: 'Low', highlight: 'Meltemi winds' },
        9: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Warm sea & calm' },
        10: { status: 'fair', tempC: 22, rainfall: 'Moderate', highlight: 'Closing season' },
        11: { status: 'avoid', tempC: 18, rainfall: 'High' },
        12: { status: 'avoid', tempC: 15, rainfall: 'High' },
      }),
    },
  },

  // Amanvari
  15278: {
    destination: 'East Cape, Baja California Sur, Mexico',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3, 4],
      bestSeason: 'Humpback Whale Migration & Crisp Desert Breezes',
      peakSeason: 'December to April',
      shoulderSeason: 'May, October, November',
      lowSeason: 'July to September (intense desert heat and tropical storm season)',
      tempRange: '24°C – 28°C (75°F – 82°F)',
      weatherSummary: 'Cloudless desert skies, zero humidity, and calm turquoise waters in the Sea of Cortez.',
      whyGo: 'Winter and spring coincide with the majestic migration of humpback and blue whales right off the East Cape, alongside optimal diving conditions in Cabo Pulmo National Marine Park. Late summer brings humid 38°C desert heat and hurricane risks.',
      climateZone: 'Arid Coastal Desert',
      months: buildMonths({
        1: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Whale watching' },
        2: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Peak migration' },
        3: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Desert wildflowers' },
        4: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Calm Sea of Cortez' },
        5: { status: 'good', tempC: 30, rainfall: 'Low', highlight: 'Great diving' },
        6: { status: 'fair', tempC: 33, rainfall: 'Low', highlight: 'Warming up' },
        7: { status: 'avoid', tempC: 36, rainfall: 'Moderate', highlight: 'High desert heat' },
        8: { status: 'avoid', tempC: 36, rainfall: 'Moderate', highlight: 'Storm watch' },
        9: { status: 'avoid', tempC: 35, rainfall: 'High', highlight: 'Tropical storms' },
        10: { status: 'good', tempC: 32, rainfall: 'Low', highlight: 'Bisbee tournament' },
        11: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Crisp desert nights' },
        12: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Festive season' },
      }),
    },
  },

  // Cheval Blanc Seychelles
  4129: {
    destination: 'Anse Intendance, Mahé, Seychelles',
    timing: {
      recommendedMonths: [4, 5, 10, 11],
      bestSeason: 'Inter-Monsoon Calm & 30m Water Visibility',
      peakSeason: 'July to August (drier, trade wind breezes) & December to January (holidays)',
      shoulderSeason: 'April to May, October to November',
      lowSeason: 'January to February (peak rainy monsoon)',
      tempRange: '27°C – 30°C (81°F – 86°F)',
      weatherSummary: 'Equatorial Indian Ocean warmth, mirror-calm turquoise waters, and lush rainforest breezes.',
      whyGo: 'The shoulder transition months between trade wind shifts (April-May and October-November) produce glass-like sea conditions with over 30 meters of underwater visibility at Anse Intendance, making diving, snorkeling, and paddleboarding sublime.',
      climateZone: 'Equatorial Tropical Island',
      months: buildMonths({
        1: { status: 'fair', tempC: 30, rainfall: 'High', highlight: 'Tropical showers' },
        2: { status: 'fair', tempC: 30, rainfall: 'High' },
        3: { status: 'good', tempC: 31, rainfall: 'Moderate', highlight: 'Warming waters' },
        4: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Glass-calm seas' },
        5: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: '30m dive clarity' },
        6: { status: 'good', tempC: 29, rainfall: 'Low', highlight: 'Southeast trade winds' },
        7: { status: 'good', tempC: 28, rainfall: 'Low', highlight: 'Cooler breezes' },
        8: { status: 'good', tempC: 28, rainfall: 'Low', highlight: 'Whale shark season' },
        9: { status: 'good', tempC: 29, rainfall: 'Low', highlight: 'Dry & breezy' },
        10: { status: 'prime', tempC: 30, rainfall: 'Moderate', highlight: 'Calm swimming' },
        11: { status: 'prime', tempC: 30, rainfall: 'Moderate', highlight: 'Turtle nesting' },
        12: { status: 'good', tempC: 30, rainfall: 'High', highlight: 'Festive tropical escape' },
      }),
    },
  },

  // The Westerly at Hilton Aruba Caribbean Resort & Casino
  15279: {
    destination: 'Palm Beach, Aruba',
    timing: {
      recommendedMonths: [1, 2, 3, 4, 5, 6, 7, 8],
      bestSeason: 'Year-Round Trade Winds & Sunshine (Outside Hurricane Belt)',
      peakSeason: 'December to April',
      shoulderSeason: 'May to August',
      lowSeason: 'September to November (slightly warmer, brief showers)',
      tempRange: '28°C – 31°C (82°F – 88°F)',
      weatherSummary: 'Consistent cooling tradewinds, 300+ sunny days a year, and serene turquoise swells.',
      whyGo: 'Safe outside the Caribbean hurricane belt, Aruba guarantees sunshine and reliable coastal breezes year-round. January to April offers the driest air and gentle surf on Palm Beach, while summer provides outstanding sailing and windsurfing.',
      climateZone: 'Arid Caribbean',
      months: buildMonths({
        1: { status: 'prime', tempC: 30, rainfall: 'Low', highlight: 'Aruba Carnival' },
        2: { status: 'prime', tempC: 30, rainfall: 'Low', highlight: 'Dry & breezy' },
        3: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Pristine beach days' },
        4: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Warm gentle waters' },
        5: { status: 'prime', tempC: 32, rainfall: 'Low', highlight: 'Soul Beach Music Fest' },
        6: { status: 'good', tempC: 32, rainfall: 'Low', highlight: 'Steady trade winds' },
        7: { status: 'good', tempC: 32, rainfall: 'Low', highlight: 'Hi-Winds kitesurfing' },
        8: { status: 'good', tempC: 33, rainfall: 'Low', highlight: 'Warm ocean' },
        9: { status: 'fair', tempC: 33, rainfall: 'Low', highlight: 'Calmest winds' },
        10: { status: 'fair', tempC: 32, rainfall: 'Moderate', highlight: 'Occasional showers' },
        11: { status: 'fair', tempC: 31, rainfall: 'Moderate', highlight: 'Short rain bursts' },
        12: { status: 'good', tempC: 30, rainfall: 'Moderate', highlight: 'Holiday retreat' },
      }),
    },
  },

  // Delano Miami Beach
  15280: {
    destination: 'South Beach, Miami Beach, Florida, USA',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3, 4],
      bestSeason: 'Winter Sun, Art Basel & Alfresco Glamour',
      peakSeason: 'December to April',
      shoulderSeason: 'May, October, November',
      lowSeason: 'June to September (hot, humid, hurricane season)',
      tempRange: '23°C – 27°C (73°F – 81°F)',
      weatherSummary: 'Balmy Atlantic breezes, low humidity, and vibrant cultural and dining festivals.',
      whyGo: 'Winter brings Miami’s pinnacle social calendar: Art Basel, the South Beach Wine & Food Festival, oceanfront pool parties, and low humidity with almost zero rainfall. Summer is muggy with heavy afternoon thunderstorms.',
      climateZone: 'Subtropical Maritime',
      months: buildMonths({
        1: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Art Deco Weekend' },
        2: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'SOBE Wine & Food' },
        3: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Miami Open & Ultra' },
        4: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Ideal beach sun' },
        5: { status: 'good', tempC: 29, rainfall: 'Moderate', highlight: 'Warm ocean' },
        6: { status: 'fair', tempC: 31, rainfall: 'High', highlight: 'Summer showers' },
        7: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Muggy humidity' },
        8: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'High heat index' },
        9: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Storm season' },
        10: { status: 'fair', tempC: 29, rainfall: 'Moderate', highlight: 'Cooling down' },
        11: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Fall beach days' },
        12: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Art Basel Miami' },
      }),
    },
  },

  // Danieli, Venezia, a Four Seasons Hotel
  15294: {
    destination: 'Riva degli Schiavoni, Venice, Italy',
    timing: {
      recommendedMonths: [4, 5, 9, 10],
      bestSeason: 'Venetian Golden Hour Light & Biennale Arts',
      peakSeason: 'May to June, September to October',
      shoulderSeason: 'April, November',
      lowSeason: 'July to August (oppressive lagoon humidity), December to February (cold, acqua alta)',
      tempRange: '18°C – 24°C (64°F – 75°F)',
      weatherSummary: 'Warm golden light across the lagoon, comfortable walking temperatures, and gentle breezes.',
      whyGo: 'Spring and autumn offer sublime afternoons over the Grand Canal, open-air gondola rides, and world-class exhibitions at the Venice Biennale. July-August brings stifling canal humidity and crushing day-tripper crowds.',
      climateZone: 'Adriatic Coastal',
      months: buildMonths({
        1: { status: 'avoid', tempC: 7, rainfall: 'Low', highlight: 'Quiet misty canals' },
        2: { status: 'good', tempC: 9, rainfall: 'Low', highlight: 'Venice Carnival' },
        3: { status: 'fair', tempC: 13, rainfall: 'Moderate' },
        4: { status: 'prime', tempC: 17, rainfall: 'Moderate', highlight: 'Spring bloom' },
        5: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Biennale openings' },
        6: { status: 'good', tempC: 26, rainfall: 'Moderate', highlight: 'Festa del Redentore' },
        7: { status: 'avoid', tempC: 29, rainfall: 'Moderate', highlight: 'High lagoon humidity' },
        8: { status: 'avoid', tempC: 29, rainfall: 'Moderate', highlight: 'Crowded bridges' },
        9: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Venice Film Festival' },
        10: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Golden lagoon light' },
        11: { status: 'fair', tempC: 13, rainfall: 'High', highlight: 'Acqua alta risk' },
        12: { status: 'avoid', tempC: 8, rainfall: 'Low', highlight: 'Winter chill' },
      }),
    },
  },

  // Corinthia Rome
  15292: {
    destination: 'Piazza del Parlamento, Rome, Italy',
    timing: {
      recommendedMonths: [4, 5, 9, 10, 11],
      bestSeason: 'Roman Piazza Living & Crisp Golden Autumn',
      peakSeason: 'April to June, September to October',
      shoulderSeason: 'March, November',
      lowSeason: 'July to August (38°C+ summer heat), January to February',
      tempRange: '18°C – 25°C (64°F – 77°F)',
      weatherSummary: 'Pleasant Mediterranean temperatures ideal for strolling historic piazzas and outdoor dining.',
      whyGo: 'Rome is magical when outdoor trattorias fill the cobblestone piazzas under wisteria blooms (spring) or golden autumn light (fall). August is intensely hot with many local restaurants shuttered for Ferragosto holiday.',
      climateZone: 'Mediterranean Continental',
      months: buildMonths({
        1: { status: 'fair', tempC: 12, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 13, rainfall: 'Moderate' },
        3: { status: 'good', tempC: 16, rainfall: 'Moderate', highlight: 'Spring arrival' },
        4: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Azalea flowers on steps' },
        5: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Rome tennis open' },
        6: { status: 'good', tempC: 28, rainfall: 'Low', highlight: 'Estate Romana events' },
        7: { status: 'avoid', tempC: 32, rainfall: 'Low', highlight: 'Intense summer heat' },
        8: { status: 'avoid', tempC: 32, rainfall: 'Low', highlight: 'Ferragosto closures' },
        9: { status: 'prime', tempC: 27, rainfall: 'Moderate', highlight: 'Mild piazza evenings' },
        10: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Ottobrata Romana' },
        11: { status: 'prime', tempC: 17, rainfall: 'High', highlight: 'Autumn harvest & truffles' },
        12: { status: 'fair', tempC: 13, rainfall: 'Moderate', highlight: 'Piazza Navona market' },
      }),
    },
  },

  // Waldorf Astoria Rabat-Salé
  15290: {
    destination: 'Salé / Rabat, Morocco',
    timing: {
      recommendedMonths: [3, 4, 5, 9, 10, 11],
      bestSeason: 'Atlantic Coastal Breezes & Royal Garden Blooms',
      peakSeason: 'April to May, September to October',
      shoulderSeason: 'June, November',
      lowSeason: 'January to February (cool & rain), July to August (hot interior)',
      tempRange: '21°C – 26°C (70°F – 79°F)',
      weatherSummary: 'Cool Atlantic breezes keep Rabat far more moderate than inland cities like Marrakech.',
      whyGo: 'Rabat’s Atlantic shoreline buffers it from interior desert extremes. Spring blooms bring fragrant orange blossoms to the Andalusian Gardens, while autumn features crisp, clear coastal days for touring the Kasbah of the Udayas.',
      climateZone: 'Atlantic Mediterranean',
      months: buildMonths({
        1: { status: 'fair', tempC: 17, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 18, rainfall: 'Moderate' },
        3: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Wildflower season' },
        4: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Andalusian blooms' },
        5: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Mawazine Festival' },
        6: { status: 'good', tempC: 26, rainfall: 'Low', highlight: 'Coastal breezes' },
        7: { status: 'good', tempC: 28, rainfall: 'Low', highlight: 'Refreshing seaside' },
        8: { status: 'good', tempC: 29, rainfall: 'Low', highlight: 'Atlantic sun' },
        9: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Golden light' },
        10: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Comfortable touring' },
        11: { status: 'prime', tempC: 21, rainfall: 'Moderate', highlight: 'Gentle warmth' },
        12: { status: 'fair', tempC: 18, rainfall: 'High' },
      }),
    },
  },

  // Six Senses London
  15303: {
    destination: 'Bayswater, London, United Kingdom',
    timing: {
      recommendedMonths: [5, 6, 7, 8, 9],
      bestSeason: '16+ Hours of Summer Daylight & Royal Park Living',
      peakSeason: 'June to August',
      shoulderSeason: 'May, September, October',
      lowSeason: 'November to February (short daylight, cold & damp)',
      tempRange: '19°C – 25°C (66°F – 77°F)',
      weatherSummary: 'Long luminous summer evenings, lush green parks, and vibrant alfresco dining.',
      whyGo: 'London in summer provides up to 16.5 hours of daylight, open-air concerts in Hyde Park (steps from Six Senses), Wimbledon, and terrace dining across Notting Hill and Mayfair. Autumn and winter are great for museum hopping and holistic wellness.',
      climateZone: 'Maritime Temperate',
      months: buildMonths({
        1: { status: 'avoid', tempC: 9, rainfall: 'Moderate', highlight: 'Short days' },
        2: { status: 'avoid', tempC: 9, rainfall: 'Low' },
        3: { status: 'fair', tempC: 12, rainfall: 'Low', highlight: 'Daffodils in parks' },
        4: { status: 'good', tempC: 15, rainfall: 'Low', highlight: 'London Marathon' },
        5: { status: 'prime', tempC: 18, rainfall: 'Low', highlight: 'Chelsea Flower Show' },
        6: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Long daylight' },
        7: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Wimbledon' },
        8: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'BBC Proms & terraces' },
        9: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'London Design Fest' },
        10: { status: 'good', tempC: 16, rainfall: 'Moderate', highlight: 'Frieze London' },
        11: { status: 'fair', tempC: 12, rainfall: 'Moderate' },
        12: { status: 'good', tempC: 9, rainfall: 'Moderate', highlight: 'Holiday lights' },
      }),
    },
  },

  // Banyan Tree Mount Emei
  15287: {
    destination: 'Mount Emei, Sichuan, China',
    timing: {
      recommendedMonths: [9, 10, 11, 4, 5],
      bestSeason: 'Sea of Clouds & Sacred Autumn Temple Colors',
      peakSeason: 'September to November, April to May',
      shoulderSeason: 'March, December',
      lowSeason: 'July to August (heavy mountain monsoon downpours)',
      tempRange: '15°C – 22°C (59°F – 72°F)',
      weatherSummary: 'High probability of clear skies above the cloud layer, crisp mountain air, and fall maples.',
      whyGo: 'Autumn grants the clearest mountain visibility to witness the Golden Summit rising above the mystical "Sea of Clouds" and Buddha’s Light phenomenon, framed by red maples and ancient monasteries. Summer brings dense fog and torrential rains.',
      climateZone: 'Subtropical Highland Cloud Forest',
      months: buildMonths({
        1: { status: 'fair', tempC: 8, rainfall: 'Low', highlight: 'Snow on Golden Summit' },
        2: { status: 'fair', tempC: 10, rainfall: 'Low', highlight: 'Winter hot springs' },
        3: { status: 'good', tempC: 14, rainfall: 'Moderate', highlight: 'Spring thaw' },
        4: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Alpine azaleas' },
        5: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Lush tea harvest' },
        6: { status: 'fair', tempC: 26, rainfall: 'High', highlight: 'Early monsoon' },
        7: { status: 'avoid', tempC: 28, rainfall: 'High', highlight: 'Heavy rain & fog' },
        8: { status: 'avoid', tempC: 28, rainfall: 'High', highlight: 'Mountain downpours' },
        9: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Clearing skies' },
        10: { status: 'prime', tempC: 18, rainfall: 'Moderate', highlight: 'Peak Sea of Clouds' },
        11: { status: 'prime', tempC: 14, rainfall: 'Low', highlight: 'Red autumn maples' },
        12: { status: 'good', tempC: 9, rainfall: 'Low', highlight: 'Crisp hot springs' },
      }),
    },
  },

  // ICEHOTEL 365
  763: {
    destination: 'Jukkasjärvi, Swedish Lapland',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 6, 7],
      bestSeason: 'Aurora Borealis in Winter or 24h Arctic Midnight Sun',
      peakSeason: 'December to March (aurora & snow)',
      shoulderSeason: 'April, September',
      lowSeason: 'May, October, November (transitional slush & overcast)',
      tempRange: '-16°C – -6°C (Winter) / 16°C – 21°C (Summer)',
      weatherSummary: 'Crisp dry subarctic cold with deep powder snow or perpetual 24-hour Arctic daylight.',
      whyGo: 'Winter delivers bucket-list thrills: dog sledding across the frozen Torne River, snowshoeing through boreal forests, and spotting the Northern Lights dancing overhead. During summer, the solar-cooled ICEHOTEL 365 lets you sleep in ice under the Midnight Sun.',
      climateZone: 'Subarctic Boreal',
      months: buildMonths({
        1: { status: 'prime', tempC: -12, rainfall: 'Low', highlight: 'Peak Northern Lights' },
        2: { status: 'prime', tempC: -10, rainfall: 'Low', highlight: 'Dog sledding & snow' },
        3: { status: 'prime', tempC: -5, rainfall: 'Low', highlight: 'Sunny winter days' },
        4: { status: 'good', tempC: 2, rainfall: 'Low', highlight: 'Spring skiing' },
        5: { status: 'avoid', tempC: 8, rainfall: 'Moderate', highlight: 'Snowmelt slush' },
        6: { status: 'prime', tempC: 16, rainfall: 'Moderate', highlight: 'Midnight Sun 24h' },
        7: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Warm Arctic days' },
        8: { status: 'good', tempC: 16, rainfall: 'Moderate', highlight: 'Cloudberry picking' },
        9: { status: 'good', tempC: 10, rainfall: 'Moderate', highlight: 'Autumn ruska colors' },
        10: { status: 'avoid', tempC: 2, rainfall: 'Moderate', highlight: 'Freezing rain' },
        11: { status: 'fair', tempC: -4, rainfall: 'Moderate', highlight: 'Early ice carving' },
        12: { status: 'prime', tempC: -9, rainfall: 'Moderate', highlight: 'Winter wonderland' },
      }),
    },
  },

  // Ciel Dubai Marina
  520: {
    destination: 'Dubai Marina, Dubai, United Arab Emirates',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3],
      bestSeason: 'Flawless Winter Sunshine & 82-Storey Marina Views',
      peakSeason: 'November to March',
      shoulderSeason: 'April, October',
      lowSeason: 'June to September (intense 43°C desert heat)',
      tempRange: '24°C – 28°C (75°F – 82°F)',
      weatherSummary: 'Cloudless sunny skies, warm Arabian Gulf seas, and comfortable evening breezes.',
      whyGo: 'Winter in Dubai is world-renowned: cloudless 26°C sunshine, alfresco marina dining, and breathtaking vistas from the world’s tallest standalone hotel tower over Palm Jumeirah. Summer temperatures routinely exceed 43°C (110°F).',
      climateZone: 'Subtropical Arid Desert',
      months: buildMonths({
        1: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Dubai Shopping Festival' },
        2: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Dubai Tennis & jazz' },
        3: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Art Dubai & beach' },
        4: { status: 'good', tempC: 33, rainfall: 'Low', highlight: 'Warm swimming' },
        5: { status: 'fair', tempC: 38, rainfall: 'Low', highlight: 'Rising heat' },
        6: { status: 'avoid', tempC: 40, rainfall: 'Low', highlight: 'Extreme summer heat' },
        7: { status: 'avoid', tempC: 42, rainfall: 'Low', highlight: 'Peak heat & humidity' },
        8: { status: 'avoid', tempC: 42, rainfall: 'Low', highlight: 'Indoor dining only' },
        9: { status: 'fair', tempC: 39, rainfall: 'Low', highlight: 'Cooling slightly' },
        10: { status: 'good', tempC: 35, rainfall: 'Low', highlight: 'Outdoor season reopens' },
        11: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Abu Dhabi GP & beach' },
        12: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Festive marina fireworks' },
      }),
    },
  },

  // The St. Regis Budapest
  15288: {
    destination: 'Klotild Palace, Budapest, Hungary',
    timing: {
      recommendedMonths: [4, 5, 6, 9, 10],
      bestSeason: 'Danube Promenades & Thermal Bath Weather',
      peakSeason: 'May to June, September to October',
      shoulderSeason: 'April, December (fairy-tale Christmas markets)',
      lowSeason: 'January to February (cold & gray)',
      tempRange: '18°C – 24°C (64°F – 75°F)',
      weatherSummary: 'Crisp Central European sunshine, blooming riverside parks, and pleasant thermal bathing.',
      whyGo: 'Late spring and early autumn bring ideal temperatures for evening Danube cruises, open-air wine bars in the Jewish Quarter, and leisurely dips in the neo-baroque Széchenyi thermal baths without oppressive midsummer heat.',
      climateZone: 'Central European Continental',
      months: buildMonths({
        1: { status: 'avoid', tempC: 3, rainfall: 'Low' },
        2: { status: 'avoid', tempC: 5, rainfall: 'Low' },
        3: { status: 'fair', tempC: 11, rainfall: 'Low', highlight: 'Budapest Spring Fest' },
        4: { status: 'prime', tempC: 17, rainfall: 'Moderate', highlight: 'Danube walks' },
        5: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Open terraces' },
        6: { status: 'prime', tempC: 26, rainfall: 'Moderate', highlight: 'Summer nights' },
        7: { status: 'good', tempC: 28, rainfall: 'Moderate', highlight: 'Formula 1 GP' },
        8: { status: 'good', tempC: 28, rainfall: 'Moderate', highlight: 'Sziget Festival' },
        9: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Budapest Wine Fest' },
        10: { status: 'prime', tempC: 16, rainfall: 'Low', highlight: 'Golden autumn leaves' },
        11: { status: 'fair', tempC: 9, rainfall: 'Moderate' },
        12: { status: 'good', tempC: 4, rainfall: 'Moderate', highlight: 'Vörösmarty Christmas market' },
      }),
    },
  },

  // HOSHINOYA Nara Prison
  15285: {
    destination: 'Nara, Kansai, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Nara Deer Park Sakura & Crimson Maple Foliage',
      peakSeason: 'Late March to May, October to November',
      shoulderSeason: 'June, September, early December',
      lowSeason: 'July to August (intense humidity), January to February',
      tempRange: '15°C – 22°C (59°F – 72°F)',
      weatherSummary: 'Crisp mountain basin air, blooming sacred temple grounds, and radiant foliage.',
      whyGo: 'Hoshino Resorts’ landmark transformation of the red-brick Meiji architectural treasure is best experienced in spring and autumn. The 1,300 sacred shika deer in neighboring Nara Park roam peacefully under pink sakura and deep red maples.',
      climateZone: 'Kansai Temperate Basin',
      months: buildMonths({
        1: { status: 'fair', tempC: 9, rainfall: 'Low', highlight: 'Wakakusa Yamayaki fire' },
        2: { status: 'fair', tempC: 10, rainfall: 'Low', highlight: 'Kasuga Taisha lantern fest' },
        3: { status: 'prime', tempC: 14, rainfall: 'Moderate', highlight: 'Omizutori ritual' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Cherry blossoms & deer' },
        5: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Fresh spring green' },
        6: { status: 'good', tempC: 28, rainfall: 'High', highlight: 'Lush bamboo groves' },
        7: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Basin heat' },
        8: { status: 'avoid', tempC: 33, rainfall: 'Moderate', highlight: 'Summer humidity' },
        9: { status: 'good', tempC: 28, rainfall: 'High', highlight: 'Cooler evenings' },
        10: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Shoso-in Exhibition' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Peak autumn momiji' },
        12: { status: 'good', tempC: 11, rainfall: 'Low', highlight: 'Kasuga Wakamiya festival' },
      }),
    },
  },

  // Imperial Hotel, Kyoto
  15282: {
    destination: 'Gion Yasaka Kaikan, Kyoto, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Gion Geiko Dances & Evening Temple Illuminations',
      peakSeason: 'April (sakura) & November (fall foliage)',
      shoulderSeason: 'May, June, September, December',
      lowSeason: 'July to August (oppressive summer basin heat)',
      tempRange: '15°C – 23°C (59°F – 73°F)',
      weatherSummary: 'Clear, crisp Kansai weather ideal for strolling historic Gion and Yasaka Shrine.',
      whyGo: 'Situated directly in Gion, spring allows guests to witness the historic Miyako Odori dances and stroll cherry blossoms along the Shirakawa canal. November features enchanting night illuminations at nearby Kodai-ji and Kiyomizu-dera.',
      climateZone: 'Kansai Basin',
      months: buildMonths({
        1: { status: 'fair', tempC: 9, rainfall: 'Low' },
        2: { status: 'fair', tempC: 10, rainfall: 'Low' },
        3: { status: 'prime', tempC: 14, rainfall: 'Moderate', highlight: 'Higashiyama Hanatouro' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Miyako Odori dances' },
        5: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Kamogawa river breezes' },
        6: { status: 'good', tempC: 28, rainfall: 'High' },
        7: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Gion Matsuri processions' },
        8: { status: 'avoid', tempC: 34, rainfall: 'Moderate', highlight: 'Daimonji bonfire heat' },
        9: { status: 'good', tempC: 29, rainfall: 'High' },
        10: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Jidai Matsuri parade' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Kodai-ji illuminations' },
        12: { status: 'good', tempC: 12, rainfall: 'Low', highlight: 'Quiet winter serenity' },
      }),
    },
  },

  // Aman New York
  4058: {
    destination: 'Crown Building, Fifth Avenue, New York City, USA',
    timing: {
      recommendedMonths: [4, 5, 6, 9, 10, 11],
      bestSeason: 'Central Park Golden Foliage & Spring Blooms',
      peakSeason: 'September to November & April to June',
      shoulderSeason: 'December (holiday magic)',
      lowSeason: 'January to February (freezing cold), July to August (humid city heat)',
      tempRange: '17°C – 24°C (63°F – 75°F)',
      weatherSummary: 'Crisp Manhattan blue skies, low humidity, and vibrant cultural openings.',
      whyGo: 'Autumn in Midtown Manhattan is unrivaled: Central Park (just three blocks north) turns into a canopy of crimson and gold, Broadway kicks off its major openings, and Fifth Avenue shopping is crisp and brisk. Late spring brings idyllic rooftop garden weather.',
      climateZone: 'Humid Continental',
      months: buildMonths({
        1: { status: 'avoid', tempC: 4, rainfall: 'Moderate', highlight: 'Winter chill' },
        2: { status: 'avoid', tempC: 6, rainfall: 'Moderate', highlight: 'NYFW Winter' },
        3: { status: 'fair', tempC: 11, rainfall: 'Moderate' },
        4: { status: 'prime', tempC: 17, rainfall: 'Moderate', highlight: 'Central Park cherry blossoms' },
        5: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Met Gala & rooftop season' },
        6: { status: 'prime', tempC: 27, rainfall: 'Moderate', highlight: 'Shakespeare in the Park' },
        7: { status: 'avoid', tempC: 30, rainfall: 'High', highlight: 'City humidity' },
        8: { status: 'avoid', tempC: 29, rainfall: 'High', highlight: 'US Open tennis' },
        9: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'NYFW & Broadway season' },
        10: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Peak Central Park foliage' },
        11: { status: 'prime', tempC: 13, rainfall: 'Moderate', highlight: 'Thanksgiving parade' },
        12: { status: 'good', tempC: 7, rainfall: 'Moderate', highlight: 'Rockefeller tree & holidays' },
      }),
    },
  },

  // 1 Hotel Tokyo
  15283: {
    destination: 'Akasaka, Minato, Tokyo, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Biophilic Urban Serenity & Tokyo Spring Blossoms',
      peakSeason: 'Late March to May, October to November',
      shoulderSeason: 'June, September, December',
      lowSeason: 'July to August (steamy tropical humidity)',
      tempRange: '16°C – 23°C (61°F – 73°F)',
      weatherSummary: 'Mild, sunny weather with clear visibility of Mount Fuji and fragrant imperial gardens.',
      whyGo: 'Spring and autumn provide crystal-clear skies for exploring Tokyo’s cutting-edge dining and design districts. The biophilic architecture of 1 Hotel Tokyo connects guests to nature amidst Akasaka’s bustling energy.',
      climateZone: 'Temperate Maritime',
      months: buildMonths({
        1: { status: 'fair', tempC: 10, rainfall: 'Low', highlight: 'Clear Mt. Fuji views' },
        2: { status: 'fair', tempC: 11, rainfall: 'Low' },
        3: { status: 'prime', tempC: 15, rainfall: 'Moderate', highlight: 'Sakura blossoms' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Roppongi garden walks' },
        5: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Spring foliage' },
        6: { status: 'good', tempC: 26, rainfall: 'High', highlight: 'Rainy season hydrangeas' },
        7: { status: 'avoid', tempC: 30, rainfall: 'High', highlight: 'Tropical humidity' },
        8: { status: 'avoid', tempC: 31, rainfall: 'Moderate', highlight: 'Summer festivals' },
        9: { status: 'good', tempC: 27, rainfall: 'High' },
        10: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Crisp autumn days' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Ginkgo tree avenues' },
        12: { status: 'good', tempC: 12, rainfall: 'Low', highlight: 'Tokyo winter illuminations' },
      }),
    },
  },

  // Four Seasons Hotel Tokyo at Marunouchi
  15284: {
    destination: 'Marunouchi, Chiyoda, Tokyo, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Imperial Palace Moats & Michelin Dining Peak',
      peakSeason: 'April (cherry blossoms) & November (autumn foliage)',
      shoulderSeason: 'May, September, December',
      lowSeason: 'July to August (high heat and humidity)',
      tempRange: '16°C – 23°C (61°F – 73°F)',
      weatherSummary: 'Pleasant, dry weather ideal for morning strolls around the Imperial Palace East Gardens.',
      whyGo: 'Directly linked to Tokyo Station, this boutique gem shines when walking the Imperial Palace moats under spring cherry blossoms or autumn golden ginkgo trees. Mid-summer is sweltering with high humidity.',
      climateZone: 'Temperate Maritime',
      months: buildMonths({
        1: { status: 'fair', tempC: 10, rainfall: 'Low' },
        2: { status: 'fair', tempC: 11, rainfall: 'Low' },
        3: { status: 'prime', tempC: 15, rainfall: 'Moderate', highlight: 'Palace sakura blooms' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Chidorigafuchi moats' },
        5: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Alfresco Marunouchi' },
        6: { status: 'good', tempC: 26, rainfall: 'High' },
        7: { status: 'avoid', tempC: 30, rainfall: 'High' },
        8: { status: 'avoid', tempC: 31, rainfall: 'Moderate' },
        9: { status: 'good', tempC: 27, rainfall: 'High' },
        10: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Tokyo Film Festival' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Ginkgo golden leaves' },
        12: { status: 'good', tempC: 12, rainfall: 'Low', highlight: 'Marunouchi champagne lights' },
      }),
    },
  },

  // The Cooper
  15276: {
    destination: 'French Quarter, Charleston, South Carolina, USA',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Lowcountry Azaleas & Harbor Breezes',
      peakSeason: 'March to May, October to November',
      shoulderSeason: 'September, December',
      lowSeason: 'June to August (intense subtropical heat & humidity)',
      tempRange: '20°C – 26°C (68°F – 79°F)',
      weatherSummary: 'Gentle Atlantic sea breezes, fragrant lowcountry blooms, and mild sunny afternoons.',
      whyGo: 'Spring brings Charleston’s celebrated Festival of Houses and Gardens, blooming azaleas and jasmine, and comfortable harbor walks along the Cooper River waterfront. Summer is heavily humid with frequent thunderstorms.',
      climateZone: 'Humid Subtropical',
      months: buildMonths({
        1: { status: 'fair', tempC: 15, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 17, rainfall: 'Moderate', highlight: 'SEWE wildlife expo' },
        3: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Charleston Food & Wine' },
        4: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Historic garden tours' },
        5: { status: 'prime', tempC: 28, rainfall: 'Moderate', highlight: 'Spoleto Festival USA' },
        6: { status: 'fair', tempC: 31, rainfall: 'High' },
        7: { status: 'avoid', tempC: 33, rainfall: 'High', highlight: 'Humid heat' },
        8: { status: 'avoid', tempC: 32, rainfall: 'High', highlight: 'Summer showers' },
        9: { status: 'good', tempC: 29, rainfall: 'Moderate' },
        10: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Crisp harbor days' },
        11: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Fall dining season' },
        12: { status: 'fair', tempC: 16, rainfall: 'Moderate', highlight: 'Holiday home tours' },
      }),
    },
  },

  // The Vanderpump Hotel
  15277: {
    destination: 'Las Vegas Strip, Nevada, USA',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Desert Poolside Season & Alfresco Strip Dining',
      peakSeason: 'March to May, October to November',
      shoulderSeason: 'September, December',
      lowSeason: 'July to August (blistering 42°C+ summer heat)',
      tempRange: '22°C – 29°C (72°F – 84°F)',
      weatherSummary: 'Warm sunny days, cool desert nights, and perfect conditions for poolside day clubs.',
      whyGo: 'Spring and autumn provide the ultimate sweet spot for walking the Strip, enjoying outdoor cabana pools, and dining on open terraces without enduring grueling 42°C (108°F) summer temperatures.',
      climateZone: 'Mojave Desert',
      months: buildMonths({
        1: { status: 'fair', tempC: 15, rainfall: 'Low', highlight: 'CES & winter rates' },
        2: { status: 'fair', tempC: 18, rainfall: 'Low', highlight: 'Super Bowl' },
        3: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Pool season opens' },
        4: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Warm cabana weather' },
        5: { status: 'prime', tempC: 32, rainfall: 'Low', highlight: 'EDC Las Vegas' },
        6: { status: 'fair', tempC: 38, rainfall: 'Low', highlight: 'Nighttime parties' },
        7: { status: 'avoid', tempC: 41, rainfall: 'Low', highlight: 'Extreme desert heat' },
        8: { status: 'avoid', tempC: 40, rainfall: 'Low', highlight: '105°F+ temperatures' },
        9: { status: 'good', tempC: 35, rainfall: 'Low', highlight: 'Life is Beautiful' },
        10: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Ideal terrace dining' },
        11: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Las Vegas Grand Prix' },
        12: { status: 'good', tempC: 15, rainfall: 'Low', highlight: 'Rodeo & New Year' },
      }),
    },
  },

  // Durango Casino & Resort
  3404: {
    destination: 'Southwest Las Vegas, Nevada, USA',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Spring Red Rock Canyon Escapes & Bel-Aire Pool Club',
      peakSeason: 'March to May, October to November',
      shoulderSeason: 'September, December',
      lowSeason: 'July to August (desert summer heat)',
      tempRange: '22°C – 29°C (72°F – 84°F)',
      weatherSummary: 'Crisp desert mornings, sunny poolside afternoons, and cool starry evenings.',
      whyGo: 'Positioned in the Southwest valley near Red Rock Canyon, spring and autumn offer prime conditions for morning hiking and afternoon relaxation at the resort’s Bel-Aire Lounge and pool club, away from the Strip congestion.',
      climateZone: 'Mojave Desert',
      months: buildMonths({
        1: { status: 'fair', tempC: 15, rainfall: 'Low' },
        2: { status: 'fair', tempC: 18, rainfall: 'Low' },
        3: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Red Rock hiking' },
        4: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Poolside sun' },
        5: { status: 'prime', tempC: 32, rainfall: 'Low', highlight: 'Warm cabana afternoons' },
        6: { status: 'fair', tempC: 38, rainfall: 'Low' },
        7: { status: 'avoid', tempC: 41, rainfall: 'Low', highlight: 'Summer heat' },
        8: { status: 'avoid', tempC: 40, rainfall: 'Low' },
        9: { status: 'good', tempC: 35, rainfall: 'Low' },
        10: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Fall desert warmth' },
        11: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Cool canyon trails' },
        12: { status: 'good', tempC: 15, rainfall: 'Low' },
      }),
    },
  },

  // Gaylord Pacific Resort
  3234: {
    destination: 'Chula Vista Bayfront, San Diego, California, USA',
    timing: {
      recommendedMonths: [6, 7, 8, 9, 10],
      bestSeason: 'Endless San Diego Summer & Coastal Bay Breezes',
      peakSeason: 'June to August (peak family summer season)',
      shoulderSeason: 'May, September, October',
      lowSeason: 'December to February (mild winter, occasional showers)',
      tempRange: '22°C – 27°C (72°F – 81°F)',
      weatherSummary: 'Sunny coastal weather, gentle sea breezes from San Diego Bay, and minimal precipitation.',
      whyGo: 'San Diego’s legendary climate is at its sunniest from June through October, providing pristine conditions for the resort’s expansive bayside waterpark, outdoor pools, and harbor promenades.',
      climateZone: 'Coastal Mediterranean',
      months: buildMonths({
        1: { status: 'fair', tempC: 19, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 19, rainfall: 'Moderate' },
        3: { status: 'fair', tempC: 20, rainfall: 'Moderate' },
        4: { status: 'good', tempC: 21, rainfall: 'Low' },
        5: { status: 'good', tempC: 21, rainfall: 'Low', highlight: 'May Gray clears' },
        6: { status: 'prime', tempC: 23, rainfall: 'Low', highlight: 'Summer waterpark fun' },
        7: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Comic-Con & bay sun' },
        8: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Warmest ocean water' },
        9: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Golden coastal September' },
        10: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Kids Free San Diego' },
        11: { status: 'good', tempC: 21, rainfall: 'Low' },
        12: { status: 'good', tempC: 19, rainfall: 'Moderate', highlight: 'Holiday bay lights' },
      }),
    },
  },

  // Conrad Nagoya
  15286: {
    destination: 'Sakae, Nagoya, Japan',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'Castle Park Sakura & Autumn Ginkgo Leaves',
      peakSeason: 'April (cherry blossoms) & November (autumn foliage)',
      shoulderSeason: 'May, June, September, December',
      lowSeason: 'July to August (hot, humid summer)',
      tempRange: '16°C – 23°C (61°F – 73°F)',
      weatherSummary: 'Crisp sunny days, clean city air, and vibrant seasonal foliage.',
      whyGo: 'Nagoya Castle grounds and Hisaya Odori Park are in peak beauty during spring sakura and autumn foliage, with crisp sunny days and vibrant culinary nightlife in Sakae.',
      climateZone: 'Temperate Maritime',
      months: buildMonths({
        1: { status: 'fair', tempC: 9, rainfall: 'Low' },
        2: { status: 'fair', tempC: 10, rainfall: 'Low' },
        3: { status: 'prime', tempC: 14, rainfall: 'Moderate', highlight: 'Early blossoms' },
        4: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Nagoya Castle sakura' },
        5: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Pleasant spring' },
        6: { status: 'good', tempC: 27, rainfall: 'High' },
        7: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Summer heat' },
        8: { status: 'avoid', tempC: 33, rainfall: 'Moderate', highlight: 'High humidity' },
        9: { status: 'good', tempC: 28, rainfall: 'High' },
        10: { status: 'prime', tempC: 23, rainfall: 'Moderate', highlight: 'Nagoya Festival' },
        11: { status: 'prime', tempC: 17, rainfall: 'Low', highlight: 'Golden ginkgo foliage' },
        12: { status: 'good', tempC: 12, rainfall: 'Low', highlight: 'Winter illuminations' },
      }),
    },
  },

  // Raffles Jeddah
  15291: {
    destination: 'Corniche, Jeddah, Saudi Arabia',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3],
      bestSeason: 'Red Sea Corniche Breezes & Jeddah Arts Season',
      peakSeason: 'November to March',
      shoulderSeason: 'April, October',
      lowSeason: 'June to August (intense humid coastal heat)',
      tempRange: '26°C – 30°C (79°F – 86°F)',
      weatherSummary: 'Warm sunny weather with coastal breezes off the Red Sea and low humidity.',
      whyGo: 'Winter brings pleasant weather along the Red Sea Corniche, Jeddah Season arts festivals, and warm waters for yachting and coral reef diving without extreme midsummer heat.',
      climateZone: 'Red Sea Coastal Arid',
      months: buildMonths({
        1: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Balad historic walks' },
        2: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Corniche breezes' },
        3: { status: 'prime', tempC: 32, rainfall: 'Low', highlight: 'Saudi Arabian GP' },
        4: { status: 'good', tempC: 35, rainfall: 'Low', highlight: 'Warm Red Sea diving' },
        5: { status: 'fair', tempC: 37, rainfall: 'Low' },
        6: { status: 'avoid', tempC: 39, rainfall: 'Low', highlight: 'High coastal heat' },
        7: { status: 'avoid', tempC: 40, rainfall: 'Low', highlight: 'Peak humidity' },
        8: { status: 'avoid', tempC: 40, rainfall: 'Low' },
        9: { status: 'fair', tempC: 38, rainfall: 'Low' },
        10: { status: 'good', tempC: 36, rainfall: 'Low', highlight: 'Diving season' },
        11: { status: 'prime', tempC: 33, rainfall: 'Moderate', highlight: 'Red Sea Film Fest' },
        12: { status: 'prime', tempC: 30, rainfall: 'Moderate', highlight: 'Pleasant evenings' },
      }),
    },
  },

  // 1 Hotel Austin
  15281: {
    destination: 'Rainey Street Historic District, Austin, Texas, USA',
    timing: {
      recommendedMonths: [3, 4, 5, 10, 11],
      bestSeason: 'SXSW, Austin City Limits & Lady Bird Lake',
      peakSeason: 'March to May, October to November',
      shoulderSeason: 'September, December',
      lowSeason: 'July to August (frequent 38°C / 100°F+ heat)',
      tempRange: '22°C – 28°C (72°F – 82°F)',
      weatherSummary: 'Sunny, pleasant Texas days ideal for paddleboarding Lady Bird Lake and live music on Rainey Street.',
      whyGo: 'Spring hosts SXSW and the Texas Hill Country bluebonnet bloom, while autumn brings Austin City Limits music festival and pleasant patio dining. Summer temperatures routinely exceed 38°C (100°F).',
      climateZone: 'Subtropical Continental',
      months: buildMonths({
        1: { status: 'fair', tempC: 16, rainfall: 'Low' },
        2: { status: 'fair', tempC: 18, rainfall: 'Moderate' },
        3: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'SXSW music & tech' },
        4: { status: 'prime', tempC: 26, rainfall: 'Moderate', highlight: 'Bluebonnets bloom' },
        5: { status: 'prime', tempC: 30, rainfall: 'High', highlight: 'Lady Bird Lake kayaking' },
        6: { status: 'fair', tempC: 34, rainfall: 'Moderate' },
        7: { status: 'avoid', tempC: 36, rainfall: 'Low', highlight: '100°F+ summer heat' },
        8: { status: 'avoid', tempC: 37, rainfall: 'Moderate', highlight: 'High heat index' },
        9: { status: 'good', tempC: 33, rainfall: 'High', highlight: 'Barton Springs pool' },
        10: { status: 'prime', tempC: 28, rainfall: 'Moderate', highlight: 'Austin City Limits (ACL)' },
        11: { status: 'prime', tempC: 22, rainfall: 'Moderate', highlight: 'Formula 1 USGP' },
        12: { status: 'fair', tempC: 17, rainfall: 'Low', highlight: 'Trail of Lights' },
      }),
    },
  },

  // Tropical Islands Resort
  836: {
    destination: 'Krausnick-Halbe, Brandenburg, Germany',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3, 4],
      bestSeason: 'Year-Round Constant 26°C Indoor Tropical Dome',
      peakSeason: 'German school holidays & winter weekends',
      shoulderSeason: 'May, September, October',
      lowSeason: 'June to August (when outdoor lakes across Germany are warm)',
      tempRange: 'Controlled 26°C (79°F) Indoors Year-Round',
      weatherSummary: 'Always 26°C with 64% humidity, real palm trees, white sandy beaches, and water lagoons.',
      whyGo: 'Housed in the world’s largest free-standing hangar, this is the ultimate winter escape from chilly European weather. It features a real indoor rainforest, water lagoons, and tropical sandy beaches regardless of outdoor frost.',
      climateZone: 'Constant Climate-Controlled Dome',
      months: buildMonths({
        1: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Winter warmth retreat' },
        2: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Tropical escape' },
        3: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Indoor rainforest' },
        4: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Lagoon swimming' },
        5: { status: 'good', tempC: 26, rainfall: 'Low' },
        6: { status: 'fair', tempC: 26, rainfall: 'Low' },
        7: { status: 'fair', tempC: 26, rainfall: 'Low' },
        8: { status: 'fair', tempC: 26, rainfall: 'Low' },
        9: { status: 'good', tempC: 26, rainfall: 'Low' },
        10: { status: 'good', tempC: 26, rainfall: 'Low' },
        11: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Pre-winter sanctuary' },
        12: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Festive family retreat' },
      }),
    },
  },

  // Universal Kids Resort
  5156: {
    destination: 'Frisco, Texas, USA',
    timing: {
      recommendedMonths: [3, 4, 5, 9, 10, 11],
      bestSeason: 'Spring Break & Autumn Family Theme Park Adventures',
      peakSeason: 'Spring Break, summer holidays, October Halloween',
      shoulderSeason: 'April, May, September, November',
      lowSeason: 'July to August (sweltering 38°C Texas summer heat)',
      tempRange: '20°C – 27°C (68°F – 81°F)',
      weatherSummary: 'Sunny, comfortable weather with lower humidity for theme park days.',
      whyGo: 'Spring and autumn provide the most enjoyable weather for young families enjoying outdoor rides and lands without the intense heat and long lines of peak summer.',
      climateZone: 'Humid Subtropical',
      months: buildMonths({
        1: { status: 'fair', tempC: 13, rainfall: 'Low' },
        2: { status: 'fair', tempC: 16, rainfall: 'Low' },
        3: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Spring Break fun' },
        4: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Pleasant park weather' },
        5: { status: 'prime', tempC: 28, rainfall: 'High', highlight: 'Early summer days' },
        6: { status: 'good', tempC: 32, rainfall: 'Moderate' },
        7: { status: 'avoid', tempC: 35, rainfall: 'Low', highlight: 'Midday heat' },
        8: { status: 'avoid', tempC: 36, rainfall: 'Low', highlight: 'Extreme summer' },
        9: { status: 'prime', tempC: 31, rainfall: 'Moderate', highlight: 'Fall openings' },
        10: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Halloween events' },
        11: { status: 'prime', tempC: 19, rainfall: 'Low', highlight: 'Thanksgiving fun' },
        12: { status: 'fair', tempC: 14, rainfall: 'Moderate', highlight: 'Holiday magic' },
      }),
    },
  },

  // Our Jungle House
  15801: {
    destination: 'Khao Sok National Park, Surat Thani, Thailand',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 4],
      bestSeason: 'Dry Season & Clear River Flow',
      peakSeason: 'December to March',
      shoulderSeason: 'April, November',
      lowSeason: 'June to October (monsoon rain & high river levels)',
      tempRange: '23°C – 32°C (73°F – 90°F)',
      weatherSummary: 'Sunny tropical days with cool jungle breezes and optimal conditions for river swimming and cave safaris.',
      whyGo: 'Khao Sok is one of Earth’s oldest primary rainforests. During the winter dry season, the Sok River runs crystal clear beneath soaring limestone karsts, making treehouse living, dawn gibbon spotting, and Cheow Lan lake expeditions ideal.',
      climateZone: 'Tropical Monsoon Rainforest',
      months: buildMonths({
        1: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Clear river swimming' },
        2: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Optimal jungle trekking' },
        3: { status: 'prime', tempC: 30, rainfall: 'Low', highlight: 'Warm sunny weather' },
        4: { status: 'prime', tempC: 31, rainfall: 'Moderate', highlight: 'Songkran celebrations' },
        5: { status: 'good', tempC: 30, rainfall: 'Moderate' },
        6: { status: 'fair', tempC: 29, rainfall: 'High' },
        7: { status: 'fair', tempC: 28, rainfall: 'High' },
        8: { status: 'avoid', tempC: 28, rainfall: 'High', highlight: 'Heavy monsoon rains' },
        9: { status: 'avoid', tempC: 27, rainfall: 'High', highlight: 'Peak monsoon' },
        10: { status: 'fair', tempC: 27, rainfall: 'High' },
        11: { status: 'good', tempC: 27, rainfall: 'Moderate', highlight: 'Post-rain green canopy' },
        12: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Cool dry breezes' },
      }),
    },
  },

  // The Birdhouse El Nido
  15802: {
    destination: 'El Nido, Bacuit Bay, Palawan, Philippines',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 4, 5],
      bestSeason: 'Dry Sunny Season & Turquoise Waters',
      peakSeason: 'January to April',
      shoulderSeason: 'May, November to December',
      lowSeason: 'July to September (southwest monsoon rains & typhoons)',
      tempRange: '25°C – 32°C (77°F – 90°F)',
      weatherSummary: 'Mirror-calm turquoise waters, sunny skies, and vivid coral visibility across Bacuit Bay.',
      whyGo: 'Palawan’s karst archipelagos are world-renowned. The dry season ensures flat seas for private banca boat island hopping to Secret Lagoon, Big Lagoon, and Nacpan Beach, with magnificent golden sunsets viewed directly from canopy tents.',
      climateZone: 'Tropical Marine Archipelago',
      months: buildMonths({
        1: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Calm turquoise seas' },
        2: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Peak visibility for coral' },
        3: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Ideal sailing weather' },
        4: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Warm tropical sunshine' },
        5: { status: 'prime', tempC: 31, rainfall: 'Moderate', highlight: 'Vibrant sunset yoga' },
        6: { status: 'good', tempC: 30, rainfall: 'Moderate' },
        7: { status: 'fair', tempC: 29, rainfall: 'High' },
        8: { status: 'avoid', tempC: 28, rainfall: 'High', highlight: 'Tropical storms' },
        9: { status: 'avoid', tempC: 28, rainfall: 'High', highlight: 'Rough ocean swells' },
        10: { status: 'fair', tempC: 29, rainfall: 'High' },
        11: { status: 'good', tempC: 29, rainfall: 'Moderate', highlight: 'Opening of dive season' },
        12: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Balmy holiday breezes' },
      }),
    },
  },

  // Riad Yasmine
  15803: {
    destination: 'Medina, Marrakech, Morocco',
    timing: {
      recommendedMonths: [3, 4, 5, 9, 10, 11],
      bestSeason: 'Spring Blossom & Mild Autumn Gold',
      peakSeason: 'April to May, October',
      shoulderSeason: 'March, November',
      lowSeason: 'July to August (extreme 42°C/108°F desert heat), January (cold nights)',
      tempRange: '18°C – 28°C (64°F – 82°F)',
      weatherSummary: 'Warm sunny days, crisp clear evening desert air, and comfortable temperatures for souk exploration.',
      whyGo: 'Spring fills the Medina with fragrant orange blossoms and rose blooms, while autumn brings gentle sunshine and golden light across the terracotta ramparts. The emerald courtyard plunge pool provides serene respite from vibrant bazaar walks.',
      climateZone: 'Semi-Arid Subtropical Mediterranean',
      months: buildMonths({
        1: { status: 'fair', tempC: 13, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 15, rainfall: 'Moderate' },
        3: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Orange blossoms in bloom' },
        4: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Warm sunny exploration' },
        5: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Balmy rooftop evenings' },
        6: { status: 'good', tempC: 31, rainfall: 'Low' },
        7: { status: 'avoid', tempC: 38, rainfall: 'Low', highlight: 'Intense Sahara heat' },
        8: { status: 'avoid', tempC: 39, rainfall: 'Low', highlight: 'Scorching midday sun' },
        9: { status: 'prime', tempC: 32, rainfall: 'Low', highlight: 'Comfortable late summer' },
        10: { status: 'prime', tempC: 26, rainfall: 'Moderate', highlight: 'Optimal sightseeing weather' },
        11: { status: 'prime', tempC: 19, rainfall: 'Moderate', highlight: 'Crisp mountain views' },
        12: { status: 'fair', tempC: 14, rainfall: 'Moderate' },
      }),
    },
  },

  // Hoshino Resorts BEB5 Karuizawa
  15804: {
    destination: 'Karuizawa, Nagano, Japan',
    timing: {
      recommendedMonths: [5, 6, 7, 8, 9, 10],
      bestSeason: 'Highland Forest Summer & Autumn Foliage',
      peakSeason: 'July to August (cool mountain summer), October (vibrant momiji)',
      shoulderSeason: 'May to June, September',
      lowSeason: 'January to February (snow conditions, though ideal for ski & onsen)',
      tempRange: '14°C – 25°C (57°F – 77°F)',
      weatherSummary: 'Cool mountain air, forested pine breezes, and refreshing escapes from Tokyo’s humid summer.',
      whyGo: 'Karuizawa has been Japan’s premier highland retreat since the 1880s. Surrounded by bird sanctuaries, waterfalls, and pine groves, BEB5 combines casual design with outdoor fire pits and free access to Tonbo-no-yu geothermal hot springs.',
      climateZone: 'Humid Continental Highland',
      months: buildMonths({
        1: { status: 'fair', tempC: -2, rainfall: 'Low', highlight: 'Winter snow & hot onsen' },
        2: { status: 'fair', tempC: -1, rainfall: 'Low', highlight: 'Crisp ski days' },
        3: { status: 'fair', tempC: 4, rainfall: 'Moderate' },
        4: { status: 'good', tempC: 10, rainfall: 'Moderate', highlight: 'Spring alpine blooms' },
        5: { status: 'prime', tempC: 16, rainfall: 'Moderate', highlight: 'Lush fresh green leaves' },
        6: { status: 'prime', tempC: 19, rainfall: 'High', highlight: 'Pleasant mountain cool' },
        7: { status: 'prime', tempC: 23, rainfall: 'High', highlight: 'Cool summer sanctuary' },
        8: { status: 'prime', tempC: 24, rainfall: 'Moderate', highlight: 'Peak forest retreat' },
        9: { status: 'prime', tempC: 19, rainfall: 'High', highlight: 'Early autumn color' },
        10: { status: 'prime', tempC: 13, rainfall: 'Moderate', highlight: 'Spectacular red maples' },
        11: { status: 'good', tempC: 8, rainfall: 'Low', highlight: 'Crisp firepit evenings' },
        12: { status: 'fair', tempC: 1, rainfall: 'Low' },
      }),
    },
  },

  // Bambu Indah
  15805: {
    destination: 'Ubud, Bali, Indonesia',
    timing: {
      recommendedMonths: [4, 5, 6, 7, 8, 9, 10],
      bestSeason: 'Dry Southeast Monsoon & Low Humidity',
      peakSeason: 'July to August',
      shoulderSeason: 'April to June, September to October',
      lowSeason: 'December to February (heavy tropical monsoon showers)',
      tempRange: '23°C – 30°C (73°F – 86°F)',
      weatherSummary: 'Consistent pleasant sunshine, clear mountain skies, and refreshing evening canyon breezes.',
      whyGo: 'Ubud is at its peak during Bali’s dry season when river currents settle into crystal cascades, rice terraces turn brilliant green, and open-air bamboo suites catch cool evening trade winds.',
      climateZone: 'Tropical Highland & River Canyon',
      months: buildMonths({
        1: { status: 'avoid', tempC: 27, rainfall: 'High', highlight: 'Heavy afternoon rain' },
        2: { status: 'avoid', tempC: 27, rainfall: 'High', highlight: 'Monsoon showers' },
        3: { status: 'good', tempC: 28, rainfall: 'Moderate', highlight: 'Nyepi silent day' },
        4: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Beginning of dry season' },
        5: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Crisp morning yoga' },
        6: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Cool river breezes' },
        7: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Peak dry perfection' },
        8: { status: 'prime', tempC: 26, rainfall: 'Low', highlight: 'Sunny canyon swimming' },
        9: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Mild golden weather' },
        10: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Warm tranquil days' },
        11: { status: 'good', tempC: 28, rainfall: 'Moderate' },
        12: { status: 'fair', tempC: 27, rainfall: 'High' },
      }),
    },
  },

  // 98 Acres Resort & Spa
  15806: {
    destination: 'Ella, Badulla District, Sri Lanka',
    timing: {
      recommendedMonths: [12, 1, 2, 3, 4, 5],
      bestSeason: 'Dry Hill Country Sunshine & Tea Harvest',
      peakSeason: 'January to March',
      shoulderSeason: 'April to May, December',
      lowSeason: 'October to November (northeast monsoon rain and mountain fog)',
      tempRange: '16°C – 26°C (61°F – 79°F)',
      weatherSummary: 'Clear panoramic mountain horizons, warm temperate afternoons, and cool highland nights.',
      whyGo: 'Ella Gap offers some of South Asia’s most dramatic topography. The early months bring crisp morning sunshine, mist rolling off Ella Rock, and clear hiking trails to Little Adam’s Peak and the Demodara Nine Arch Bridge.',
      climateZone: 'Subtropical Highland Tea Country',
      months: buildMonths({
        1: { status: 'prime', tempC: 21, rainfall: 'Low', highlight: 'Crystal clear Ella Gap views' },
        2: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Optimal hiking weather' },
        3: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Warm sunny tea estate days' },
        4: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Sinhala New Year celebrations' },
        5: { status: 'prime', tempC: 25, rainfall: 'Moderate', highlight: 'Lush green tea hills' },
        6: { status: 'good', tempC: 24, rainfall: 'Moderate' },
        7: { status: 'good', tempC: 23, rainfall: 'Moderate' },
        8: { status: 'good', tempC: 23, rainfall: 'Moderate' },
        9: { status: 'good', tempC: 23, rainfall: 'Moderate' },
        10: { status: 'fair', tempC: 22, rainfall: 'High' },
        11: { status: 'fair', tempC: 21, rainfall: 'High', highlight: 'Heavy afternoon rain' },
        12: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Crisp cool holiday air' },
      }),
    },
  },

  // Cabañas CuatroCuatros
  15807: {
    destination: 'Valle de Guadalupe / Ensenada, Baja California, Mexico',
    timing: {
      recommendedMonths: [4, 5, 6, 7, 8, 9, 10, 11],
      bestSeason: 'Warm Pacific Sun & Grape Harvest (Vendimia)',
      peakSeason: 'August to October',
      shoulderSeason: 'April to June, November',
      lowSeason: 'January to February (cool Pacific fog & winter rains)',
      tempRange: '17°C – 28°C (63°F – 82°F)',
      weatherSummary: 'Mediterranean coastal sunshine tempered by refreshing afternoon Pacific ocean breezes.',
      whyGo: 'Baja’s northern coast offers an intoxicating blend of vineyard glamping, artisan olive oil, and dramatic ocean cliffs. August brings the world-renowned Fiestas de la Vendimia grape harvest celebrations.',
      climateZone: 'Mediterranean Coastal Desert',
      months: buildMonths({
        1: { status: 'fair', tempC: 16, rainfall: 'Moderate' },
        2: { status: 'fair', tempC: 16, rainfall: 'Moderate' },
        3: { status: 'good', tempC: 18, rainfall: 'Low', highlight: 'Spring vineyard budbreak' },
        4: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Sunny comfortable days' },
        5: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Crisp cliffside breezes' },
        6: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Long warm evenings' },
        7: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Golden beach days' },
        8: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Vendimia wine harvest' },
        9: { status: 'prime', tempC: 27, rainfall: 'Low', highlight: 'Peak harvest tastings' },
        10: { status: 'prime', tempC: 24, rainfall: 'Low', highlight: 'Warm autumn sunsets' },
        11: { status: 'prime', tempC: 20, rainfall: 'Low', highlight: 'Cool tranquil harvest close' },
        12: { status: 'good', tempC: 17, rainfall: 'Moderate' },
      }),
    },
  },

  // Playa Viva
  15808: {
    destination: 'Juluchuca, Zihuatanejo Coast, Mexico',
    timing: {
      recommendedMonths: [11, 12, 1, 2, 3, 4, 5],
      bestSeason: 'Dry Pacific Winter & Sea Turtle Nesting',
      peakSeason: 'December to April',
      shoulderSeason: 'November, May',
      lowSeason: 'July to September (tropical rainy season & high ocean humidity)',
      tempRange: '24°C – 31°C (75°F – 88°F)',
      weatherSummary: 'Guaranteed sunshine, warm ocean water, and cool night breezes off the Sierra Madre mountains.',
      whyGo: 'Playa Viva is pure regenerative magic. During the dry winter, calm seas lap against private white sands, thousands of olive ridley and leatherback baby turtles hatch daily at dawn, and bamboo treehouses stay completely open to starry skies.',
      climateZone: 'Tropical Coastal Pacific',
      months: buildMonths({
        1: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Peak baby sea turtle releases' },
        2: { status: 'prime', tempC: 28, rainfall: 'Low', highlight: 'Calm ocean waters' },
        3: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Dry sunny beach days' },
        4: { status: 'prime', tempC: 30, rainfall: 'Low', highlight: 'Warm tropical surf' },
        5: { status: 'prime', tempC: 31, rainfall: 'Low', highlight: 'Serene coastal yoga' },
        6: { status: 'good', tempC: 32, rainfall: 'Moderate' },
        7: { status: 'fair', tempC: 32, rainfall: 'High' },
        8: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Tropical storms' },
        9: { status: 'avoid', tempC: 31, rainfall: 'High', highlight: 'Heavy rain' },
        10: { status: 'fair', tempC: 31, rainfall: 'Moderate' },
        11: { status: 'prime', tempC: 30, rainfall: 'Low', highlight: 'Dry season begins' },
        12: { status: 'prime', tempC: 29, rainfall: 'Low', highlight: 'Holiday ocean paradise' },
      }),
    },
  },
};

// Fallback timing for any resort without custom overrides.
const DEFAULT_TIMING: BestTimeToGo = {
  recommendedMonths: [4, 5, 9, 10],
  bestSeason: 'Spring & Early Autumn Shoulder Season',
  peakSeason: 'May to June, September to October',
  shoulderSeason: 'April, November',
  lowSeason: 'July to August (peak crowds), December to February (winter)',
  tempRange: '18°C – 25°C (64°F – 77°F)',
  weatherSummary: 'Comfortable seasonal temperatures with mild sunshine and pleasant sightseeing conditions.',
  whyGo: 'Shoulder seasons consistently offer the finest balance: mild walking weather, warm sunshine, full venue operations, and noticeably lighter tourist crowds.',
  climateZone: 'Temperate Maritime',
  months: buildMonths({
    1: { status: 'fair', tempC: 10, rainfall: 'Moderate' },
    2: { status: 'fair', tempC: 12, rainfall: 'Moderate' },
    3: { status: 'fair', tempC: 15, rainfall: 'Moderate' },
    4: { status: 'good', tempC: 18, rainfall: 'Low', highlight: 'Spring awakening' },
    5: { status: 'prime', tempC: 22, rainfall: 'Low', highlight: 'Optimal sunshine' },
    6: { status: 'good', tempC: 26, rainfall: 'Low', highlight: 'Early summer' },
    7: { status: 'good', tempC: 29, rainfall: 'Low', highlight: 'Peak season' },
    8: { status: 'good', tempC: 29, rainfall: 'Low' },
    9: { status: 'prime', tempC: 25, rainfall: 'Low', highlight: 'Golden shoulder season' },
    10: { status: 'prime', tempC: 20, rainfall: 'Moderate', highlight: 'Pleasant temperatures' },
    11: { status: 'good', tempC: 15, rainfall: 'Moderate' },
    12: { status: 'fair', tempC: 11, rainfall: 'Moderate' },
  }),
};

export function getBestTimeToGo(pinId: number): { destination: string; timing: BestTimeToGo } {
  return RESORT_TIMING_MAP[pinId] ?? { destination: 'Worldwide Resort', timing: DEFAULT_TIMING };
}

export function isMonthInPrimeSeason(timing: BestTimeToGo, month: number): boolean {
  return timing.recommendedMonths.includes(month);
}

export function formatMonthRange(months: number[]): string {
  if (!months.length) return 'Year-round';
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 1) return MONTH_NAMES[sorted[0] - 1];

  // Group contiguous
  const groups: number[][] = [];
  let cur: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur.push(sorted[i]);
    } else {
      groups.push(cur);
      cur = [sorted[i]];
    }
  }
  groups.push(cur);

  return groups
    .map((g) => (g.length > 1 ? `${MONTH_NAMES[g[0] - 1]} – ${MONTH_NAMES[g[g.length - 1] - 1]}` : MONTH_NAMES[g[0] - 1]))
    .join(' & ');
}

export const RESORT_PRICE_RANGES: Record<number, { min: number; max: number; currency: string }> = {
  // Capella Kyoto: ¥185,000 to ¥360,000 ($1,250 - $2,400)
  15302: { min: 1250, max: 2400, currency: 'USD' },
  // Four Seasons Hotel and Residences Cartagena: $750 - $1,400
  15274: { min: 750, max: 1400, currency: 'USD' },
  // Waldorf Astoria Rabat-Salé: 5,500 MAD to 11,000 MAD ($550 - $1,100)
  15290: { min: 550, max: 1100, currency: 'USD' },
  // Corinthia Rome: €1,100 to €2,000 ($1,200 - $2,200)
  15292: { min: 1200, max: 2200, currency: 'USD' },
  // Six Senses London: £850 to £1,650 ($1,100 - $2,100)
  15303: { min: 1100, max: 2100, currency: 'USD' },
  // Aman New York: $2,200 - $3,800
  4058: { min: 2200, max: 3800, currency: 'USD' },
  // 1 Hotel Tokyo: ¥110,000 to ¥200,000 ($750 - $1,350)
  15283: { min: 750, max: 1350, currency: 'USD' },
  // Four Seasons Hotel Tokyo at Marunouchi: ¥165,000 to ¥290,000 ($1,100 - $1,950)
  15284: { min: 1100, max: 1950, currency: 'USD' },
  // The St. Regis Budapest: €650 to €1,200 ($700 - $1,300)
  15288: { min: 700, max: 1300, currency: 'USD' },
  // Amoh, a Luxury Collection Resort, Rhodes: €550 to €1,100 ($600 - $1,200)
  15289: { min: 600, max: 1200, currency: 'USD' },
  // Cheval Blanc Seychelles: €2,400 to €4,800 ($2,600 - $5,200)
  4129: { min: 2600, max: 5200, currency: 'USD' },
  // Amanvari, Baja California Sur: $1,950 - $3,500
  15278: { min: 1950, max: 3500, currency: 'USD' },
  // Four Seasons Hotel Mykonos: €1,200 to €2,400 ($1,300 - $2,600)
  15295: { min: 1300, max: 2600, currency: 'USD' },
  // The St. Regis Costa Mujeres Resort, Cancún: $650 - $1,350
  15275: { min: 650, max: 1350, currency: 'USD' },
  // COMO Le Beauvallon, Bay of Saint-Tropez: €1,150 to €2,300 ($1,250 - $2,500)
  15293: { min: 1250, max: 2500, currency: 'USD' },
  // The Westerly at Hilton Aruba: $420 - $850
  15279: { min: 420, max: 850, currency: 'USD' },
  // Delano Miami Beach: $550 - $1,250
  15280: { min: 550, max: 1250, currency: 'USD' },
  // Danieli, Venezia, a Four Seasons Hotel: €1,350 to €2,700 ($1,450 - $2,900)
  15294: { min: 1450, max: 2900, currency: 'USD' },
  // Imperial Hotel, Kyoto: ¥110,000 to ¥220,000 ($750 - $1,500)
  15282: { min: 750, max: 1500, currency: 'USD' },
  // HOSHINOYA Nara Prison: ¥80,000 to ¥160,000 ($540 - $1,080)
  15285: { min: 540, max: 1080, currency: 'USD' },
  // The Cooper, Charleston: $450 - $850
  15276: { min: 450, max: 850, currency: 'USD' },
  // Conrad Nagoya: ¥42,000 to ¥85,000 ($280 - $570)
  15286: { min: 280, max: 570, currency: 'USD' },
  // Raffles Jeddah: SAR 3,000 to SAR 6,000 ($800 - $1,600)
  15291: { min: 800, max: 1600, currency: 'USD' },
  // 1 Hotel Austin: $350 - $750
  15281: { min: 350, max: 750, currency: 'USD' },
  // The Vanderpump Hotel, Las Vegas Strip: $180 - $420
  15277: { min: 180, max: 420, currency: 'USD' },
  // ICEHOTEL 365, Sweden: SEK 3,600 to SEK 11,800 ($350 - $1,150)
  763: { min: 350, max: 1150, currency: 'USD' },
  // Banyan Tree Mount Emei: RMB 2,000 to RMB 4,400 ($280 - $620)
  15287: { min: 280, max: 620, currency: 'USD' },
  // Ciel Dubai Marina: AED 700 to AED 1,800 ($190 - $490)
  520: { min: 190, max: 490, currency: 'USD' },
  // Tropical Islands Resort, Germany: €120 to €350 ($130 - $380)
  836: { min: 130, max: 380, currency: 'USD' },
  // Universal Kids Resort Hotel, Frisco: $220 - $480
  5156: { min: 220, max: 480, currency: 'USD' },
  // Gaylord Pacific Resort, Chula Vista: $280 - $550 (nightly rate; $1.3B is project construction cost)
  3234: { min: 280, max: 550, currency: 'USD' },
  // Durango Casino & Resort, Las Vegas: $150 - $380 (nightly rate; $385M is expansion construction cost)
  3404: { min: 150, max: 380, currency: 'USD' },
  // Budget-friendly resorts ($75 – $260/night)
  15801: { min: 75, max: 145, currency: 'USD' },
  15802: { min: 115, max: 190, currency: 'USD' },
  15803: { min: 120, max: 185, currency: 'USD' },
  15804: { min: 130, max: 210, currency: 'USD' },
  15805: { min: 145, max: 260, currency: 'USD' },
  15806: { min: 155, max: 245, currency: 'USD' },
  15807: { min: 175, max: 260, currency: 'USD' },
  15808: { min: 215, max: 320, currency: 'USD' },
};

// Signature top activities repository for all 32 curated resorts and luxury retreats.
export const RESORT_ACTIVITIES_MAP: Record<number, ResortActivity[]> = {
  // Capella Kyoto
  15302: [
    {
      title: 'Private Kennin-ji Zen Temple Morning Meditation',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Exclusive early-access meditation inside Kyoto’s oldest Zen temple grounds before public opening hours.',
    },
    {
      title: 'Auriga Spa Geisha Beauty & Botanical Onsen Ritual',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Japanese hot-spring mineral baths infused with locally distilled Uji green tea extracts and sake lees.',
    },
    {
      title: 'Higashiyama Kaiseki & Rare Sake Pairing Masterclass',
      category: 'Dining',
      season: 'Spring & Autumn',
      description: 'Multi-course seasonal dining with master chefs celebrating Kansai heirloom vegetables and Kyoto brewery vintages.',
    },
    {
      title: 'Traditional Wagashi Sweet-Making & Origami Family Workshop',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Hands-on confectionery craft and Japanese paper-folding class tailored for young artists and parents.',
    },
  ],

  // Four Seasons Hotel and Residences Cartagena
  15274: [
    {
      title: 'Historic Walled City & Getsemaní Street Art Walking Tour',
      category: 'Culture',
      season: 'Dec – Apr',
      description: 'Privately guided exploration of 16th-century colonial fortifications, vibrant street murals, and colonial courtyards in Getsemaní.',
    },
    {
      title: 'Rosario Islands Private Catamaran Coral Snorkel',
      category: 'Water',
      season: 'Dec – Apr',
      description: 'Privately chartered sailing catamaran to the archipelago’s crystal-clear turquoise waters and protected coral reefs.',
    },
    {
      title: 'Rooftop Caribbean Sunset & Colombian Rum Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Sip aged single-origin Colombian rums paired with Caribbean-inspired ceviches overlooking the historic fortress ramparts.',
    },
    {
      title: 'Castillo San Felipe Secret Tunnels & Pirate Lore Family Walk',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Explore subterranean fortress passages, lookout ramparts, and colonial Caribbean legends with a dedicated family guide.',
    },
  ],

  // Waldorf Astoria Rabat-Salé
  15290: [
    {
      title: 'Kasbah of the Udayas & Andalusian Gardens Private Walk',
      category: 'Culture',
      season: 'Mar – May & Sep – Nov',
      description: 'Stroll ancient 12th-century blue-and-white clifftop alleyways and blooming jasmine gardens overlooking the Atlantic Ocean and Bouregreg River.',
    },
    {
      title: 'Bouregreg Marina Royal Yacht Cruise',
      category: 'Water',
      season: 'Apr – Oct',
      description: 'Private sunset sailing along the Bouregreg estuary with panoramic views of the Mohammed VI Tower and Hassan Tower minaret.',
    },
    {
      title: 'Traditional Moroccan Argan & Orange Blossom Hammam',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Luxurious authentic marble bath ritual featuring black eucalyptus soap, rhassoul clay wraps, and pure organic argan oil.',
    },
    {
      title: 'Rabat National Zoological Garden Atlas Lion Safari',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Open-air wildlife expedition observing majestic Atlas lions, Sahara antelopes, and desert fennec foxes in open biotopes.',
    },
  ],

  // Corinthia Rome
  15292: [
    {
      title: 'Private After-Hours Pantheon & Piazza Navona Walk',
      category: 'Culture',
      season: 'Apr – Jun & Sep – Oct',
      description: 'Exclusive twilight tour through historic cobblestone lanes and ancient Roman monuments without daytime tourist crowds.',
    },
    {
      title: 'Subterranean Terme Roman Thermal Bath Sanctuary',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Multi-sensory hydrotherapy circuit inspired by ancient Roman caldarium, tepidarium, and frigidarium ritual baths.',
    },
    {
      title: 'Chef-Led Campo de\' Fiori Market & Rooftop Masterclass',
      category: 'Dining',
      season: 'Spring & Autumn',
      description: 'Select fresh heirloom Roman produce with the executive chef followed by an intimate pasta and wine pairing class.',
    },
    {
      title: 'Junior Gladiator School & Ancient Roman Mosaic Workshop',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Don historical tunics to learn wooden-sword gladiator defense games followed by crafting authentic marble mosaic souvenirs.',
    },
  ],

  // Six Senses London
  15303: [
    {
      title: 'Six Senses Integrated Biohacking & Hydrotherapy Spa',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Subterranean longevity haven featuring cryotherapy, ozone sauna, infrared pods, and 20-metre indoor mineral lap pool.',
    },
    {
      title: 'Hyde Park Sunrise Jogging & Serpentine Boating',
      category: 'Nature',
      season: 'Apr – Sep',
      description: 'Guided morning trail runs beneath London planes and private rowboat charters on the Serpentine Lake just blocks away.',
    },
    {
      title: 'Bespoke Bayswater Antique & Portobello Road Discovery',
      category: 'Culture',
      season: 'Year-round',
      description: 'VIP curator-guided treasure hunt through Notting Hill’s legendary vintage boutiques, silver arcades, and galleries.',
    },
    {
      title: 'Diana Memorial Pirate Ship Playground & Serpentine Boating',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Apr – Oct',
      description: 'Climb aboard the full-scale wooden pirate galleon in Kensington Gardens and feed royal mute swans along the Serpentine.',
    },
  ],

  // Aman New York
  4058: [
    {
      title: 'Three-Story Flagship Aman Spa & Private Banya Suites',
      category: 'Wellness',
      season: 'Year-round',
      description: '25,000-square-foot holistic sanctuary featuring a 65-foot indoor pool, cryotherapy, and private outdoor banya garden terraces.',
    },
    {
      title: 'Central Park South Private Sunrise Architectural Tour',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Curated architectural immersion into Manhattan’s historic gilded-age mansions and Central Park just two blocks north.',
    },
    {
      title: 'Nama Japanese Washoku & Terrace Teppanyaki Experience',
      category: 'Dining',
      season: 'Year-round',
      description: 'Masterful Edomae sushi and binchotan-grilled delights savored beside tranquil outdoor reflecting pools on Fifth Avenue.',
    },
    {
      title: 'Central Park Zoo & Belvedere Castle Discovery Safari',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Guided family treasure hunt visiting sea lion feedings, snow leopards, the puppet theater, and Gothic stone castle turrets.',
    },
  ],

  // 1 Hotel Tokyo
  15283: [
    {
      title: 'Biophilic Urban Nature Meditation & Plant Styling Workshop',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Mindfulness sessions amidst living greenery walls and moss gardens designed to ground travelers in Tokyo’s pulsing core.',
    },
    {
      title: 'Hie Shrine Ceremonial Torii Walk & Akasaka Heritage Tour',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Explore the iconic red torii gates and ancient Shinto traditions tucked within Tokyo’s modern diplomatic district.',
    },
    {
      title: 'Farm-to-Table Sustainable Japanese Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Seasonal zero-waste culinary tasting highlighting organic produce from small-scale regenerative farms across Kanto.',
    },
    {
      title: 'teamLab Planets Interactive Water & Sensory Digital Art',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Wade barefoot through knee-deep water projected with swimming digital koi carp and traverse infinity crystal rooms.',
    },
  ],

  // Four Seasons Hotel Tokyo at Marunouchi
  15284: [
    {
      title: 'Imperial Palace Outer Garden Jogging & Biking',
      category: 'Nature',
      season: 'Spring & Autumn',
      description: 'Scenic 5km loop around the historic Edo Castle stone walls and tranquil moats with loaner Tokyo bikes.',
    },
    {
      title: 'Maison Marunouchi French Bistro Masterclass',
      category: 'Dining',
      season: 'Year-round',
      description: 'Refined Parisian bistro classics and afternoon tea served with panoramic views of bullet trains gliding into Tokyo Station.',
    },
    {
      title: 'Traditional Japanese Onsen-Style Hot Spring Bathing',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Serene spa sanctuary with mineral-rich hot springs, steam saunas, and jet beds to relieve international travel fatigue.',
    },
    {
      title: 'Tokyo Station Bullet Train Conductor & Shinkansen Experience',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'VIP platform tour greeting high-speed Shinkansen trains, wearing miniature conductor caps, and visiting the train museum.',
    },
  ],

  // The St. Regis Budapest
  15288: [
    {
      title: 'Danube River Private Vintage Wooden Speedboat Cruise',
      category: 'Water',
      season: 'May – Sep',
      description: 'Glide past the illuminated Hungarian Parliament and Buda Castle aboard a classic mahogany motor launch.',
    },
    {
      title: 'Historic Thermal Bath & Mineral Hydrotherapy Circuit',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Indulge in Budapest’s legendary geothermal waters paired with custom Hungarian Moor mud detoxifying wraps.',
    },
    {
      title: 'Tokaj Aszú Masterclass & Hungarian Caviar Tasting',
      category: 'Dining',
      season: 'Year-round',
      description: 'Sommelier-curated degustation of rare vintage volcanic Tokaj dessert wines and artisanal sturgeon caviar.',
    },
    {
      title: 'Budapest Children’s Railway & Forest Hills Cogwheel Tram',
      category: 'Kids',
      kidsFriendly: true,
      season: 'May – Oct',
      description: 'Ride vintage narrow-gauge heritage trains operated entirely by Hungarian school children through scenic Buda mountain forests.',
    },
  ],

  // Amoh, a Luxury Collection Resort, Rhodes
  15289: [
    {
      title: 'Private Aegean Catamaran & Hidden Coves Charter',
      category: 'Water',
      season: 'May – Oct',
      description: 'Sail crystal turquoise waters around Navarone Bay and secluded southern beaches with local mezze and wine.',
    },
    {
      title: 'Lindos Acropolis Sunrise Temple Ascent',
      category: 'Culture',
      season: 'May – Jun & Sep – Oct',
      description: 'Private early-morning hike up ancient Hellenistic temples perched high above the Mediterranean.',
    },
    {
      title: 'Rhodesian Vineyard & Olive Grove Wine Tasting',
      category: 'Dining',
      season: 'May – Oct',
      description: 'Sip native Athiri and Mandilaria varietals at historic mountain estates accompanied by local goat cheeses.',
    },
    {
      title: 'Valley of the Butterflies Nature Safari & Medieval Castle Hunt',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Jun – Sep',
      description: 'Family walking trail amid thousands of Panaxia quadripunctaria butterflies, wooden bridges, and knight castle ruins.',
    },
  ],

  // Cheval Blanc Seychelles
  4129: [
    {
      title: 'Anse Intendance Whale Shark & Coral Reef Snorkeling',
      category: 'Water',
      season: 'Oct – Jan',
      description: 'Guided open-ocean marine expeditions along southern Mahé waters to snorkel alongside migrating whale sharks and sea turtles.',
    },
    {
      title: 'Cheval Blanc Spa Guerlain Island Wellness Pavilions',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Tailored sensory therapies and tropical botanical baths surrounded by lush rainforest granite boulders.',
    },
    {
      title: 'Morne Seychellois National Park Forest Canopy Trek',
      category: 'Nature',
      season: 'May – Oct',
      description: 'Hike through misty endemic palm forests and granite peaks with resident naturalists discovering rare Seychelles wildlife.',
    },
    {
      title: 'Le Carrousel Kids Club Giant Aldabra Tortoise Feeding',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Meet and feed resident giant Aldabra tortoises, embark on tropical treasure hunts, and craft coconut-leaf souvenirs.',
    },
  ],

  // Amanvari, Baja California Sur
  15278: [
    {
      title: 'Sea of Cortez Private Catamaran & Jacques Cousteau Snorkel',
      category: 'Water',
      season: 'Nov – May',
      description: 'Private boat excursion to Cabo Pulmo National Marine Park, the world-famous living coral reef teeming with marine life.',
    },
    {
      title: 'Aman Spa Temazcal Sweat Lodge & Baja Herb Healing',
      category: 'Wellness',
      season: 'Nov – Apr',
      description: 'Ancient Mesoamerican steam purification ceremony led by a native shaman utilizing wild desert sage and copal.',
    },
    {
      title: 'East Cape Desert Dune Sunset UTV Expedition',
      category: 'Adventure',
      season: 'Nov – May',
      description: 'Navigate golden desert arroyos and untouched beachfront dunes with dramatic views of the Sea of Cortez at golden hour.',
    },
    {
      title: 'Cabo Pulmo Marine Reserve Junior Coral Reef Explorer',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – May',
      description: 'Guided shallow tidepool exploration and sea turtle encounters designed specifically for junior marine biologists.',
    },
  ],

  // Four Seasons Hotel Mykonos
  15295: [
    {
      title: 'Delos Island Sacred UNESCO Sanctuary Private Charter',
      category: 'Culture',
      season: 'May – Oct',
      description: 'Private yacht excursion to the mythological birthplace of Apollo to explore magnificent marble ruins with an archaeologist.',
    },
    {
      title: 'Aegean Cliffside Sunset Yoga & Mediterranean Spa',
      category: 'Wellness',
      season: 'May – Oct',
      description: 'Vinyasa flow perched above Kalo Livadi bay followed by cold-pressed olive oil and Greek herb massage therapies.',
    },
    {
      title: 'Cycladic Catch-of-the-Day Alfresco Seafood Feast',
      category: 'Dining',
      season: 'Jun – Sep',
      description: 'Fresh Aegean octopus and sea bass grilled over olive wood embers right at the water’s edge with crisp Assyrtiko wine.',
    },
    {
      title: 'Little Explorers Aegean Tidepool Safari & Sandcastle Camp',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Jun – Sep',
      description: 'Beachside marine discoveries, colorful Aegean seashell hunting, and guided Greek pastry baking for children.',
    },
  ],

  // The St. Regis Costa Mujeres Resort, Cancún
  15275: [
    {
      title: 'Isla Mujeres Private Catamaran Snorkel & Sandbar Sail',
      category: 'Water',
      season: 'Dec – Apr',
      description: 'Sail across iridescent turquoise shallows to secluded coral reefs and the El Garrafón underwater marine reserve.',
    },
    {
      title: 'Chichén Itzá & Cenote Private Helicopter Expedition',
      category: 'Culture',
      season: 'Dec – Apr',
      description: 'Direct aerial charter to the ancient Mayan wonder followed by a private swim in an exclusive, sacred limestone cenote.',
    },
    {
      title: 'Iridium Spa Mayan Honey & Sacred Melipona Ritual',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Restorative body therapies utilizing indigenous stingless bee honey, healing copal incense, and sea salt hydrotherapy.',
    },
    {
      title: 'Little Treasures Mayan Chocolate & Sacred Melipona Bee Farm',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Hands-on organic cacao grinding workshop crafting ancient Mayan drinking chocolates and visiting stingless bee sanctuaries.',
    },
  ],

  // COMO Le Beauvallon, Bay of Saint-Tropez
  15293: [
    {
      title: 'Bay of Saint-Tropez Private Riva Yacht Navigation',
      category: 'Water',
      season: 'May – Oct',
      description: 'Glide across the sparkling Gulf of Saint-Tropez aboard an iconic classic mahogany Riva to Pampelonne Beach club coves.',
    },
    {
      title: 'COMO Shambhala Urban Escape Holistic Wellness',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Signature Asian-inspired holistic treatments, restorative sound baths, and cliff-view pilates overlooking the Mediterranean.',
    },
    {
      title: 'Côtes de Provence Vineyard Tour & Private Cellar Tasting',
      category: 'Dining',
      season: 'May – Oct',
      description: 'Explore historic family-owned estates among pine-clad hills sampling premier cru classé Provence rosés and olive oils.',
    },
    {
      title: 'Little Sailors Wooden Model Boat Regatta & Gelato Tasting',
      category: 'Kids',
      kidsFriendly: true,
      season: 'May – Sep',
      description: 'Sail handcrafted wooden toy boats in historical harbor fountains followed by an artisanal French Riviera gelato tour.',
    },
  ],

  // The Westerly at Hilton Aruba
  15279: [
    {
      title: 'Antilla Shipwreck & Boca Catalina Coral Snorkel',
      category: 'Water',
      season: 'Year-round',
      description: 'Explore the Caribbean’s largest intact WWII shipwreck and vibrant shallow reefs teeming with sea turtles and parrotfish.',
    },
    {
      title: 'Arikok National Park Rugged 4x4 Desert Safari',
      category: 'Adventure',
      season: 'Year-round',
      description: 'Journey across volcanic limestone terrain, secluded natural ocean pools, and ancient Arawak Indian petroglyph caves.',
    },
    {
      title: 'Aloe Vera & Caribbean Sea Salt Oceanfront Spa',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Rejuvenating body polish and soothing sunburn relief therapies utilizing organic Aruban aloe harvested on-island.',
    },
    {
      title: 'Aruba Butterfly Farm & Baby Sea Turtle Coastal Watch',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Walk through tropical mesh gardens of hundreds of rare butterfly species and observe protected sea turtle hatchlings on Palm Beach.',
    },
  ],

  // Delano Miami Beach
  15280: [
    {
      title: 'South Beach Art Deco Historic Architectural Walking Tour',
      category: 'Culture',
      season: 'Nov – Apr',
      description: 'Privately guided exploration of iconic pastel streamline modern architecture, neon landmarks, and Ocean Drive history.',
    },
    {
      title: 'Biscayne Bay Private Sunset Catamaran Charter',
      category: 'Water',
      season: 'Nov – May',
      description: 'Sip vintage champagne while cruising past Star Island celebrity villas and the glittering downtown Miami skyline.',
    },
    {
      title: 'Subterranean Club & Iconic Oceanfront Pool Cabana Service',
      category: 'Dining',
      season: 'Year-round',
      description: 'Signature poolside luxury with chilled eucalyptus towels, fresh crudo, and craft tropical mixology under swaying palms.',
    },
    {
      title: 'Miami Children’s Museum & Biscayne Bay Manatee Boat Tour',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – May',
      description: 'Interactive cultural exhibits on Watson Island followed by a slow-cruising boat spotting wild manatees in shallow mangrove channels.',
    },
  ],

  // Danieli, Venezia, a Four Seasons Hotel
  15294: [
    {
      title: 'Private Twilight Venetian Gondola Serenade & Canal Tour',
      category: 'Culture',
      season: 'Apr – Jun & Sep – Oct',
      description: 'Glide along hidden canal waterways and under the Bridge of Sighs on a handcrafted private gondola at golden hour.',
    },
    {
      title: 'Murano Private Glassblowing Foundry & Master Artisan Tour',
      category: 'Culture',
      season: 'Year-round',
      description: 'Private water taxi to historic island furnaces to watch master glass sculptors craft incandescent Venetian crystal.',
    },
    {
      title: 'Terrazza Danieli Lagoon-View Gastronomic Degustation',
      category: 'Dining',
      season: 'Apr – Oct',
      description: 'Iconic rooftop dining overlooking the Grand Canal and San Giorgio Maggiore featuring fresh Adriatic seafood and prosecco.',
    },
    {
      title: 'Carnival Masquerade Mask Painting & Murano Glass Junior Camp',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Design and paint personal papier-mâché Venetian carnival masks using gold leaf and plumage with historic artisans.',
    },
  ],

  // Imperial Hotel, Kyoto
  15282: [
    {
      title: 'Gion Geiko & Maiko Private Ochaya Tea Ceremony',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Exclusive after-hours invitation into a historic Gion teahouse for classical koto music, seasonal dance, and matcha.',
    },
    {
      title: 'Higashiyama Heritage Zen Temple & Dry Garden Stroll',
      category: 'Nature',
      season: 'Spring & Autumn',
      description: 'Mindful dawn walk through ancient moss gardens, weeping cherry blossoms, and raked gravel courtyards.',
    },
    {
      title: 'Kyo-Kaiseki Seasonal Culinary Masterclass',
      category: 'Dining',
      season: 'Year-round',
      description: 'Exquisite multi-course banquet showcasing centuries-old Kyoto culinary arts, delicate dashi, and lacquerware presentation.',
    },
    {
      title: 'Kyoto Railway Museum & Traditional Hand-Dyeing Family Craft',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Explore Japan’s largest collection of steam locomotives with interactive driving simulators and Shibori fabric dyeing.',
    },
  ],

  // HOSHINOYA Nara Prison
  15285: [
    {
      title: 'Meiji-Era Red Brick Architectural Heritage Walk',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Curated architectural tour exploring the meticulously restored 1908 Meiji modern prison complex and five-winged radial design.',
    },
    {
      title: 'Nara Park Sacred Sika Deer & Kasuga Taisha Shrine Dawn Walk',
      category: 'Nature',
      season: 'Spring & Autumn',
      description: 'Morning walk among hundreds of free-roaming sacred deer and moss-covered stone lanterns in ancient primeval forest.',
    },
    {
      title: 'Nara Fermented Herbal Bath & Healing Japanese Spa',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Restorative body therapies utilizing indigenous Yamato medicinal herbs, Hinoki cypress oils, and hot mineral baths.',
    },
    {
      title: 'Nara Park Sacred Sika Deer Feeding & Family Biscuit Trail',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Spring & Autumn',
      description: 'Purchase shika-senbei rice crackers to bow to and feed hundreds of tame sacred sika deer roaming beneath ancient cedars.',
    },
  ],

  // The Cooper, Charleston
  15276: [
    {
      title: 'Charleston Harbor Historic Schooner Sunset Sail',
      category: 'Water',
      season: 'Mar – May & Sep – Nov',
      description: 'Sail past Fort Sumter and the Battery aboard a classic tall-ship schooner with Lowcountry cocktails in hand.',
    },
    {
      title: 'Historic French Quarter Wrought Iron & Garden Walk',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Historian-guided tour through cobblestone alleyways, blooming confederate jasmine, and historic antebellum courtyards.',
    },
    {
      title: 'Lowcountry She-Crab Soup & Fresh Carolina Oyster Roast',
      category: 'Dining',
      season: 'Oct – Apr',
      description: 'Waterfront wood-fired oyster roast featuring local Single Lady oysters, house-cured ham, and small-batch bourbon.',
    },
    {
      title: 'South Carolina Aquarium Sea Turtle Hospital & Harbor Dolphin Tour',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Mar – Nov',
      description: 'Go behind the scenes at the sea turtle recovery ward and cruise Charleston Harbor spotting playful bottlenose pods.',
    },
  ],

  // Conrad Nagoya
  15286: [
    {
      title: 'Nagoya Castle Golden Shachihoko & Honmaru Palace Tour',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Private tour of the reconstructed samurai palace marveling at gold-leaf painted screens and towering castle keeps.',
    },
    {
      title: 'Atsuta Jingu Sacred Cedar Forest Shinto Shrine Walk',
      category: 'Nature',
      season: 'Year-round',
      description: 'Tranquil walk through 1,900-year-old sacred forest grounds housing one of Japan’s most revered imperial regalia shrines.',
    },
    {
      title: 'Hitsumabushi Charred Eel & Local Sake Tasting Masterclass',
      category: 'Dining',
      season: 'Year-round',
      description: 'Savor Nagoya’s iconic multi-step grilled unagi eel delicacy paired with award-winning Aichi prefecture junmai sakes.',
    },
    {
      title: 'SCMAGLEV Railway Park & High-Speed Bullet Train Simulator',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Experience cutting-edge magnetic levitation transit technology and drive life-sized Shinkansen simulators.',
    },
  ],

  // Raffles Jeddah
  15291: [
    {
      title: 'Al-Balad UNESCO Historic District Coral Architecture Walk',
      category: 'Culture',
      season: 'Nov – Mar',
      description: 'Explore ancient Hijazi merchant towers with intricately carved wooden roshan balconies and fragrant frankincense souks.',
    },
    {
      title: 'Red Sea Coastline Private Yacht & Coral Reef Diving',
      category: 'Water',
      season: 'Oct – Apr',
      description: 'Chartered yacht exploration along pristine coastal barrier reefs teeming with vibrant marine life and turquoise waters.',
    },
    {
      title: 'Raffles Spa Traditional Arabian Oud Hammam Ritual',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Signature body cleansing ritual with natural eucalyptus black soap, crushed sea salts, and fragrant pure Arabian oud.',
    },
    {
      title: 'Red Sea Floating Mosque Walk & Fakieh Aquarium Dolphin Show',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – Apr',
      description: 'Stroll along the Corniche sea boardwalk to the floating Al-Rahma mosque followed by interactive coral and dolphin presentations.',
    },
  ],

  // 1 Hotel Austin
  15281: [
    {
      title: 'Lady Bird Lake Sunrise Paddleboarding & Kayak Tour',
      category: 'Water',
      season: 'Mar – May & Sep – Nov',
      description: 'Paddle past cypress trees and natural spring inlets with sweeping views of the downtown Austin skyline.',
    },
    {
      title: 'Ann and Roy Butler Hike-and-Bike Trail Guided Run',
      category: 'Nature',
      season: 'Mar – May & Oct – Nov',
      description: 'Scenic 10-mile lakeside loop exploring Barton Springs, wildflower meadows, and historic city park bridges.',
    },
    {
      title: 'Hill Country Heritage Smokehouse & Craft Cider Tasting',
      category: 'Dining',
      season: 'Year-round',
      description: 'Authentic post-oak smoked barbecue paired with local Texas Hill Country ciders and biodynamic wines.',
    },
    {
      title: 'Barton Springs Splash & Thinkery Children’s Museum Day',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Mar – Oct',
      description: 'Swim in the legendary natural spring-fed pool and explore steam-powered laboratory exhibits at Austin’s premier science lab.',
    },
  ],

  // The Vanderpump Hotel
  15277: [
    {
      title: 'Vanderpump Garden Cocktail Masterclass & Tea Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Signature mixology immersion with floral-infused spirits, rose petals, and decadent French-inspired sweet confections.',
    },
    {
      title: 'Opulent French-Gothic Spa & Hydrotherapy Plunge Pools',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Sensory relaxation haven with crystal steam chambers, lavender mist vitality pools, and rejuvenating glow facials.',
    },
    {
      title: 'Private Bellagio Fountains & Strip Helicopter Twilight Flight',
      category: 'Adventure',
      season: 'Year-round',
      description: 'Nighttime aerial helicopter tour above the neon brilliance of the Las Vegas Strip and illuminated dancing fountains.',
    },
    {
      title: 'Shark Reef Aquarium Mandalay Bay & Bellagio Floral Garden Walk',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Walk through underwater glass predator tunnels with giant sawfish followed by seasonal conservatory fairytale flower displays.',
    },
  ],

  // ICEHOTEL 365
  763: [
    {
      title: 'Torne River Pure Ice Sculpting Masterclass',
      category: 'Snow',
      season: 'Year-round',
      description: 'Chisel your own crystalline ice sculpture from gigantic crystal blocks cut directly from the Torne River.',
    },
    {
      title: 'Aurora Borealis Siberian Husky Sledding Safari',
      category: 'Snow',
      season: 'Dec – Mar',
      description: 'Drive a spirited dog team through moonlit taiga snow forests under dancing curtains of the Northern Lights.',
    },
    {
      title: 'Indigenous Sámi Reindeer Sled & Lavvu Hearth Dinner',
      category: 'Culture',
      season: 'Nov – Apr',
      description: 'Meet Sámi reindeer herders, feed the herd, and savor slow-cooked Arctic dishes around an open hearth.',
    },
    {
      title: 'Indigenous Sámi Reindeer Sledding & Family Hearth Storytelling',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – Apr',
      description: 'Feed gentle Arctic reindeer, ride family sleds across snowy pastures, and listen to Sámi folktales in a cozy fireside lavvu.',
    },
  ],

  // Banyan Tree Mount Emei
  15287: [
    {
      title: 'Golden Summit Sunrise & Sea of Clouds Pilgrimage',
      category: 'Culture',
      season: 'Year-round',
      description: 'Ascend Mount Emei’s sacred Buddhist peak to watch the dawn sun illuminate the multi-faced golden Samantabhadra statue above rolling clouds.',
    },
    {
      title: 'Natural Geothermal Hot Spring & Sichuan Tea Bathing',
      category: 'Wellness',
      season: 'Autumn & Winter',
      description: 'Soak in private mineral hot springs infused with organic Mount Emei green tea and indigenous Tibetan herbs.',
    },
    {
      title: 'Mount Emei Wild Bamboo & Sichuan Gourmet Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Authentic Sichuan fine dining featuring freshly harvested mountain bamboo shoots, wild river carp, and numbing peppercorn broths.',
    },
    {
      title: 'Mount Emei Wild Forest Monkey Watching & Tea Bush Planting',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Spring & Autumn',
      description: 'Guided family nature walk observing playful Tibetan macaques from safe platforms and planting heirloom organic tea saplings.',
    },
  ],

  // Ciel Dubai Marina
  520: [
    {
      title: 'World\'s Highest Infinity Pool Skyline Swim',
      category: 'Water',
      season: 'Oct – Apr',
      description: 'Swim in the record-breaking rooftop infinity pool over 360 metres above the Arabian Gulf with vistas of Palm Jumeirah.',
    },
    {
      title: 'Dubai Marina Private Luxury Sunset Yacht Charter',
      category: 'Water',
      season: 'Oct – May',
      description: 'Private motor yacht cruise along the illuminated Marina promenade, Ain Dubai, and Bluewaters Island.',
    },
    {
      title: 'Sky-High 82nd-Floor Observation Lounge & Mixology',
      category: 'Dining',
      season: 'Year-round',
      description: 'Sip bespoke craft cocktails while gazing down on the glittering Dubai Marina towers and Arabian coastline.',
    },
    {
      title: 'Aquaventure Waterpark VIP Family Day & Lost Chambers Aquarium',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Oct – May',
      description: 'Full-day family thrills on record-breaking waterslides and exploring mysterious sunken city tunnels with 65,000 marine animals.',
    },
  ],

  // Tropical Islands Resort
  836: [
    {
      title: 'Indoor Tropical Sea & Whitewater River Rapids',
      category: 'Water',
      season: 'Year-round',
      description: 'Swim in constant 28°C indoor lagoons with 200-metre sandy beaches, palm trees, and rushing whitewater flumes.',
    },
    {
      title: 'World’s Largest Indoor Rainforest Ecosystem Walk',
      category: 'Nature',
      season: 'Year-round',
      description: 'Stroll winding trails through 50,000 living tropical plants, free-roaming peacocks, and flamingos beneath the dome.',
    },
    {
      title: 'Island Airship 60-Metre Hot Air Balloon Flight',
      category: 'Adventure',
      season: 'Year-round',
      description: 'Ascend quietly in a tethered balloon high into the monumental former zeppelin hangar for aerial views.',
    },
    {
      title: 'Tropino Kids Club Giant Climbing Jungle, Bumper Boats & Kart Track',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Expansive 4,000 m² indoor play paradise with soft-play obstacle courses, mini bumper boats on water basins, and electric go-karts.',
    },
  ],

  // Universal Kids Resort Hotel, Frisco
  5156: [
    {
      title: 'Universal Kids Theme Park VIP Early Park Access',
      category: 'Adventure',
      season: 'Year-round',
      description: 'Enjoy exclusive one-hour early entry to Universal’s lands, interactive character meets, and whimsical family attractions.',
    },
    {
      title: 'Zero-Entry Family Lagoon Pool & Splash Water Playground',
      category: 'Water',
      season: 'Apr – Oct',
      description: 'Resort pool retreat featuring interactive water jets, waterslides, and dedicated poolside cabanas for young families.',
    },
    {
      title: 'Themed Character Dining & Interactive Storybook Breakfast',
      category: 'Dining',
      season: 'Year-round',
      description: 'Whimsical culinary mornings with beloved animated characters and kid-crafted artisanal pancake stations.',
    },
    {
      title: 'Camp Universal Interactive Animated Character Quest',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Special storybook breakfast with beloved animated characters followed by an interactive scavenger hunt through the themed hotel corridors.',
    },
  ],

  // Gaylord Pacific Resort, Chula Vista
  3234: [
    {
      title: 'Expansive Bayside Waterpark & FlowRider Surfing',
      category: 'Water',
      season: 'May – Oct',
      description: 'Experience 4.25 acres of outdoor water attractions including lazy rivers, waterslides, and coastal wave simulators.',
    },
    {
      title: 'San Diego Bayfront Promenade Sunset Biking & Sailing',
      category: 'Nature',
      season: 'Year-round',
      description: 'Cruise along the newly expanded Chula Vista Marina boardwalk and charter private catamarans across San Diego Bay.',
    },
    {
      title: 'Relâche Spa Coastal Botanical Treatments & Vitality Pools',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Full-service wellness haven offering Pacific sea salt scrubs, eucalyptus steam rooms, and outdoor heated vitality pools.',
    },
    {
      title: 'Camp Gaylord Junior Marine Explorer & Scavenger Quest',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Interactive family quest discovering San Diego bay ecology, outdoor garden animal tracking, and evening bayside s’mores bonfires.',
    },
  ],

  // Durango Casino & Resort, Las Vegas
  3404: [
    {
      title: 'Bel-Aire Backyard Pool Club Cabana Relaxation',
      category: 'Wellness',
      season: 'Apr – Oct',
      description: 'Lounge in private cabanas surrounded by lush palm greenery with daybed service, cooling misters, and craft frozen cocktails.',
    },
    {
      title: 'Red Rock Canyon Scenic Loop & Sunrise Hiking',
      category: 'Adventure',
      season: 'Oct – May',
      description: 'Guided morning trek through spectacular red sandstone canyon peaks located just 15 minutes west of the resort.',
    },
    {
      title: 'Nicco\'s Prime Cuts & Craft Culinary Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Prime dry-aged steaks, fresh market seafood, and curated California cabernets in Durango’s acclaimed signature steakhouse.',
    },
    {
      title: 'Red Rock Canyon Junior Ranger Dinosaur Track & Fossil Trail',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Oct – May',
      description: 'Guided family hike discovering ancient Jurassic sandstone dunes, fossilized dinosaur footprints, and desert bighorn sheep.',
    },
  ],

  // Our Jungle House
  15801: [
    {
      title: 'Khao Sok Cheow Lan Lake & Emerald Cave Longtail Boat Safari',
      category: 'Water',
      season: 'Dec – Apr',
      description: 'Glide past towering limestone karsts across emerald Cheow Lan lake, exploring hidden caves and floating raft houses.',
    },
    {
      title: 'Dawn Gibbon Trek & Canopy Bamboo Birdwatching Walk',
      category: 'Nature',
      season: 'Year-round',
      description: 'Follow experienced indigenous jungle trackers into the 160-million-year-old canopy as wild white-handed gibbons call at dawn.',
    },
    {
      title: 'Midnight Rainforest Flashlight Safari & Night River Tubing',
      category: 'Adventure',
      season: 'Nov – May',
      description: 'Equipped with headlamps, drift quietly down the Sok River under starlight spotting sleeping hornbills and nocturnal civets.',
    },
    {
      title: 'Sok River Gentle Bamboo Rafting & Cliffside Monkey Spotting',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – May',
      description: 'Drift along calm crystal river waters on handcrafted bamboo rafts while local guides point out macaque families and kingfishers.',
    },
  ],

  // The Birdhouse El Nido
  15802: [
    {
      title: 'Bacuit Archipelago Secret Lagoon & Big Lagoon Private Outrigger Safari',
      category: 'Water',
      season: 'Dec – May',
      description: 'Privately chartered motorized outrigger cruising through dramatic karst arches into pristine turquoise lagoons and coral gardens.',
    },
    {
      title: 'Sunset Yoga on the Open-Air Marimegmeg Cliff Pavilion',
      category: 'Wellness',
      season: 'Nov – May',
      description: 'Unwind with daily sunset vinyasa flow overlooking coconut canopies and the vivid pastel skies of Bacuit Bay.',
    },
    {
      title: 'Guided Jungle Ridge Hike to Nacpan Twin Beach',
      category: 'Adventure',
      season: 'Dec – Apr',
      description: 'Scenic ridge expedition through coastal forests leading to the legendary 4-kilometer stretch of golden Nacpan surf.',
    },
    {
      title: 'Bacuit Bay Coral Reef Snorkel & Baby Sea Turtle Safari',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Dec – May',
      description: 'Gentle family boat tour to shallow sheltered lagoons teeming with friendly clownfish, blue sea stars, and baby green sea turtles.',
    },
  ],

  // Riad Yasmine
  15803: [
    {
      title: 'Private Medina Spice Market & Artisanal Leather Souk Discovery',
      category: 'Culture',
      season: 'Year-round',
      description: 'Privately guided walk through winding alleys to ancient dye vats, saffron spice apothecaries, and hidden brass artisan workshops.',
    },
    {
      title: 'Rooftop Sunset Moroccan Mint Tea & Traditional Pastilla Tasting',
      category: 'Dining',
      season: 'Mar – Nov',
      description: 'Sip fresh spearmint tea on Berber daybeds as the evening call to prayer echoes across the Medina rooftops.',
    },
    {
      title: 'Atlas Mountain Ourika Valley Berber Village Day Trek',
      category: 'Adventure',
      season: 'Mar – May & Sep – Nov',
      description: 'Escorted journey into the High Atlas foothills, hiking alongside rushing mountain streams to traditional adobe Berber hamlets.',
    },
    {
      title: 'Palmerai Camel Caravan Ride & Berber Family Pottery Workshop',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Oct – May',
      description: 'Ride gentle saddled dromedary camels through ancient palm groves and learn traditional terracotta clay pottery molding.',
    },
  ],

  // Hoshino Resorts BEB5 Karuizawa
  15804: [
    {
      title: 'Tonbo-no-yu Natural Geothermal Spring Bathing Under Forest Pines',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Soak in spacious open-air granite rock baths fed by pure volcanic hot spring waters surrounded by whispering pine needles.',
    },
    {
      title: 'Karuizawa Wild Bird Sanctuary Dawn Guided Forest Walk',
      category: 'Nature',
      season: 'May – Oct',
      description: 'Early morning naturalist tour through protected alpine wetlands spotting rare Asian songbirds, giant flying squirrels, and serows.',
    },
    {
      title: 'Tamariba 24-Hour Courtyard Firepit Stargazing & Nagano Craft Cider',
      category: 'Dining',
      season: 'Year-round',
      description: 'Roast marshmallows and sample local Shinshu apple cider around outdoor wood-deck bonfires under unpolluted mountain skies.',
    },
    {
      title: 'Giant Flying Squirrel Night Safari & Bonfire S’mores Roasting',
      category: 'Kids',
      kidsFriendly: true,
      season: 'May – Oct',
      description: 'Guided twilight forest expedition with night-vision scopes watching giant musasabi flying squirrels glide through treetops.',
    },
  ],

  // Bambu Indah
  15805: [
    {
      title: 'Natural River Canyon Swimming & Rope Swing Plunge',
      category: 'Water',
      season: 'Apr – Oct',
      description: 'Plunge from Tarzan rope swings into crystal spring-fed rock pools along the cascading rapids of the sacred Ayung River.',
    },
    {
      title: 'Regenerative Permaculture Farm Tour & Balinese Herbal Medicine Workshop',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Hands-on journey through organic food forests crafting traditional Jamu healing tonics and sacred temple offerings.',
    },
    {
      title: 'Minang House Bamboo Dining Overlooking the Ayung River Rapids',
      category: 'Dining',
      season: 'Year-round',
      description: 'Savor organic farm-to-table Balinese feasts inside an open-air hyperbolic bamboo pavilion perched right above the rapids.',
    },
    {
      title: 'Ayung River Natural Rock Slide & Balinese Kite Flying Workshop',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Apr – Oct',
      description: 'Craft and fly colorful giant Balinese kites over open rice paddies and splash in natural spring-fed canyon swimming holes.',
    },
  ],

  // 98 Acres Resort & Spa
  15806: [
    {
      title: 'Sunrise Hike to Little Adam’s Peak & Nine Arch Railway Bridge',
      category: 'Adventure',
      season: 'Dec – May',
      description: 'Gentle sunrise trail across emerald tea hills to the iconic colonial stone viaduct as vintage highland trains cross the chasm.',
    },
    {
      title: 'Ceylon Tea Plucking & Historic Factory Cupping Masterclass',
      category: 'Culture',
      season: 'Year-round',
      description: 'Don traditional wicker baskets with local tea pluckers and learn the orthodox rolling and drying secrets of world-renowned Ceylon tea.',
    },
    {
      title: 'Balcony Infinity Pool Soak Facing the 1,000-Meter Ella Gap',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Immerse in heated waters on the timber deck gazing into the colossal southern mountain gap rolling all the way to the coast.',
    },
    {
      title: 'Demodara Nine Arch Bridge Steam Train Spotting & Tea Picking',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Wave to conductors as historic red steam trains chug across the viaduct, followed by gentle tea picking on the lower slopes.',
    },
  ],

  // Cabañas CuatroCuatros
  15807: [
    {
      title: 'Bar Bura Clifftop Sunset Wine Tasting Overlooking the Pacific Ocean',
      category: 'Dining',
      season: 'Apr – Nov',
      description: 'Sit on rustic wooden perches 200 meters above crashing Pacific waves sampling estate Nebbiolo and Baja artisanal cheeses.',
    },
    {
      title: 'Valle de Guadalupe Boutique Organic Vineyard & Olive Oil Tour',
      category: 'Culture',
      season: 'Apr – Nov',
      description: 'Private 4x4 excursion through 800 hectares of coastal vines, maritime chaparral, and 100-year-old olive groves.',
    },
    {
      title: 'Desert Coastal Ridge Horseback Ride to Salsipuedes Bay',
      category: 'Adventure',
      season: 'Year-round',
      description: 'Canter along scenic desert ridges between coastal sage and rugged sea cliffs with views stretching towards Ensenada bay.',
    },
    {
      title: 'Pacific Clifftop Coastal Zip-Line & Farm Animal Petting Tour',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Year-round',
      description: 'Soar on secure dual-cable family zip-lines over coastal chaparral and meet heritage farm animals in the estate valley.',
    },
  ],

  // Playa Viva
  15808: [
    {
      title: 'Dawn Leatherback & Olive Ridley Baby Sea Turtle Beach Release',
      category: 'Nature',
      season: 'Nov – May',
      description: 'Accompany La Tortuga Viva sanctuary volunteers at sunrise to gently release newly hatched baby sea turtles into the Pacific surf.',
    },
    {
      title: 'Oceanfront Open-Air Pavilion Daily Vinyasa Yoga & Sound Meditation',
      category: 'Wellness',
      season: 'Nov – May',
      description: 'Start every morning with mindful breath and oceanfront movement accompanied by the rhythmic sound of breaking Pacific waves.',
    },
    {
      title: 'Estuary Kayak Safari Through Coastal Mangrove Lagoons',
      category: 'Water',
      season: 'Nov – Apr',
      description: 'Paddle through serene saltwater mangrove forests observing roseate spoonbills, white ibises, and coastal biodiversity.',
    },
    {
      title: 'La Tortuga Viva Baby Turtle Hatchling Dawn Release & Farm Walk',
      category: 'Kids',
      kidsFriendly: true,
      season: 'Nov – May',
      description: 'Children gently guide newborn olive ridley and leatherback hatchlings as they take their first tiny flipper steps into the ocean.',
    },
  ],
};

export function getResortTopActivities(pinId: number): ResortActivity[] {
  return RESORT_ACTIVITIES_MAP[pinId] ?? [];
}

export function formatPricePerNight(
  minOrAmount?: number | null,
  maxAmount?: number | null,
  currency: string = 'USD',
): PricePerNight | undefined {
  if (minOrAmount == null || !Number.isFinite(minOrAmount) || minOrAmount <= 0) return undefined;
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '$';

  if (typeof maxAmount === 'number' && Number.isFinite(maxAmount) && maxAmount > minOrAmount) {
    return {
      amount: minOrAmount,
      maxAmount,
      currency,
      formatted: `${symbol}${minOrAmount.toLocaleString()} – ${symbol}${maxAmount.toLocaleString()}`,
      isRange: true,
    };
  }

  return {
    amount: minOrAmount,
    currency,
    formatted: `${symbol}${minOrAmount.toLocaleString()}`,
    isRange: false,
  };
}

export function getResortPricePerNight(
  pinId: number,
  pinPrice?: number | null,
  pinCurrency?: string | null,
  pinMaxPrice?: number | null,
): PricePerNight | undefined {
  const curated = RESORT_PRICE_RANGES[pinId];
  if (curated) {
    return formatPricePerNight(curated.min, curated.max, curated.currency);
  }
  // Only accept pinPrice if it represents a plausible nightly hotel rate (<= $10,000), never a construction/project cost
  const isNightlyPrice = typeof pinPrice === 'number' && pinPrice > 0 && pinPrice <= 10000;
  const min = isNightlyPrice ? pinPrice : undefined;
  const max = typeof pinMaxPrice === 'number' && pinMaxPrice > 0 && pinMaxPrice <= 25000 ? pinMaxPrice : undefined;
  const currency = pinCurrency ?? 'USD';
  if (min !== undefined) {
    return formatPricePerNight(min, max, currency);
  }
  return undefined;
}

export type TravelSort =
  | 'rating-desc'
  | 'rating-asc'
  | 'price-asc'
  | 'price-desc'
  | 'distance-asc'
  | 'distance-desc'
  | 'score';

export function getResortEffectiveNightlyRate(resort: TravelResortPin): number {
  return (
    resort.pricePerNight?.amount ??
    getResortPricePerNight(
      resort.id,
      resort.priceLowerBound ?? resort.price,
      resort.priceCurrency,
      resort.priceUpperBound,
    )?.amount ??
    999999
  );
}

export function sortTravelResorts(
  resorts: TravelResortPin[],
  sortOrder: TravelSort = 'rating-desc',
  activeSeasonMonths?: readonly number[] | null,
  origin?: Place,
): TravelResortPin[] {
  return [...resorts].sort((a, b) => {
    // 1. If a season is active, prioritize properties in prime season first
    if (activeSeasonMonths && activeSeasonMonths.length > 0) {
      const aPrime = a.bestTimeToGo.recommendedMonths.some((m) => activeSeasonMonths.includes(m)) ? 1 : 0;
      const bPrime = b.bestTimeToGo.recommendedMonths.some((m) => activeSeasonMonths.includes(m)) ? 1 : 0;
      if (aPrime !== bPrime) return bPrime - aPrime;
    }

    if (sortOrder === 'distance-asc' || sortOrder === 'distance-desc') {
      const valid = (p: TravelResortPin) =>
        p.latitude !== null &&
        p.longitude !== null &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude);
      const hasA = Boolean(origin && valid(a));
      const hasB = Boolean(origin && valid(b));
      if (hasA !== hasB) {
        return hasA ? -1 : 1;
      }
      if (hasA && hasB) {
        const distA = distanceKm(origin!, { latitude: a.latitude!, longitude: a.longitude! });
        const distB = distanceKm(origin!, { latitude: b.latitude!, longitude: b.longitude! });
        if (distA !== distB) {
          return sortOrder === 'distance-asc' ? distA - distB : distB - distA;
        }
      }
      if (b.rubricScore !== a.rubricScore) return b.rubricScore - a.rubricScore;
      return (a.productName ?? a.title).localeCompare(b.productName ?? b.title);
    }

    const aPrice = getResortEffectiveNightlyRate(a);
    const bPrice = getResortEffectiveNightlyRate(b);

    if (sortOrder === 'price-asc') {
      if (aPrice !== bPrice) return aPrice - bPrice;
      if (b.rubricScore !== a.rubricScore) return b.rubricScore - a.rubricScore;
      return (a.productName ?? a.title).localeCompare(b.productName ?? b.title);
    }

    if (sortOrder === 'price-desc') {
      if (aPrice !== bPrice) return bPrice - aPrice;
      if (b.rubricScore !== a.rubricScore) return b.rubricScore - a.rubricScore;
      return (a.productName ?? a.title).localeCompare(b.productName ?? b.title);
    }

    if (sortOrder === 'rating-asc') {
      if (a.rubricScore !== b.rubricScore) return a.rubricScore - b.rubricScore;
      if (aPrice !== bPrice) return aPrice - bPrice;
      return (a.productName ?? a.title).localeCompare(b.productName ?? b.title);
    }

    // Default: 'rating-desc' | 'score'
    if (b.rubricScore !== a.rubricScore) return b.rubricScore - a.rubricScore;
    if (aPrice !== bPrice) return aPrice - bPrice;
    return (a.productName ?? a.title).localeCompare(b.productName ?? b.title);
  });
}

