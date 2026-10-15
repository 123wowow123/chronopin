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
  | 'Snow';

export type ResortActivity = {
  title: string;
  category: ActivityCategory;
  season?: string;
  description: string;
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
  15302: { min: 1250, max: 2400, currency: 'USD' },
  15274: { min: 750, max: 1400, currency: 'USD' },
  15290: { min: 550, max: 1100, currency: 'USD' },
  15292: { min: 1200, max: 2200, currency: 'USD' },
  15303: { min: 1100, max: 2100, currency: 'USD' },
  4058: { min: 2200, max: 3800, currency: 'USD' },
  15283: { min: 750, max: 1350, currency: 'USD' },
  15284: { min: 1100, max: 1950, currency: 'USD' },
  15288: { min: 700, max: 1300, currency: 'USD' },
  15289: { min: 600, max: 1200, currency: 'USD' },
  4129: { min: 2600, max: 5200, currency: 'USD' },
  15278: { min: 1950, max: 3500, currency: 'USD' },
  15295: { min: 1300, max: 2600, currency: 'USD' },
  15275: { min: 1450, max: 2800, currency: 'USD' },
  15293: { min: 1250, max: 2500, currency: 'USD' },
  15279: { min: 1100, max: 2200, currency: 'USD' },
  15280: { min: 2800, max: 4600, currency: 'USD' },
  15294: { min: 1450, max: 2900, currency: 'USD' },
  15282: { min: 950, max: 1750, currency: 'USD' },
  15285: { min: 1750, max: 3400, currency: 'USD' },
  15276: { min: 1400, max: 2600, currency: 'USD' },
  15286: { min: 870, max: 1950, currency: 'USD' },
  15291: { min: 800, max: 1600, currency: 'USD' },
  15281: { min: 1950, max: 3600, currency: 'USD' },
  15277: { min: 1050, max: 2100, currency: 'USD' },
  763: { min: 820, max: 1500, currency: 'USD' },
  15287: { min: 2100, max: 3200, currency: 'USD' },
  520: { min: 1350, max: 2100, currency: 'USD' },
  836: { min: 1350, max: 2600, currency: 'USD' },
  5156: { min: 2450, max: 3950, currency: 'USD' },
  3234: { min: 1650, max: 2600, currency: 'USD' },
  3404: { min: 890, max: 1550, currency: 'USD' },
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
  ],

  // The Tokyo EDITION, Ginza
  15274: [
    {
      title: 'Punch Room Japanese Tea & Spirit Mixology',
      category: 'Dining',
      season: 'Year-round',
      description: 'Bespoke cocktail degustation blending ceremonial grade matcha, sencha, and small-batch craft shochu.',
    },
    {
      title: 'Kabuki-za Theatre Private Backstage & Gallery Walk',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Curated architectural and cultural immersion into the historic theater heart of Ginza.',
    },
    {
      title: 'Rooftop Oasis Sunset Vinyasa Yoga',
      category: 'Wellness',
      season: 'Spring to Autumn',
      description: 'Twilight wellness sessions overlooking Tokyo Tower and the glittering Ginza skyline.',
    },
  ],

  // Janu Tokyo
  15290: [
    {
      title: 'Janu Wellness 4,000 m² Banya & Hammam Immersion',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Tokyo’s most expansive urban hydrotherapy spa with private Russian banya and marble Turkish hammam suites.',
    },
    {
      title: 'teamLab Borderless VIP Priority Access',
      category: 'Culture',
      season: 'Year-round',
      description: 'Seamless VIP entry to the digital art museum integrated within the Azabudai Hills complex.',
    },
    {
      title: 'Janu Grill Edomae Sumibi Theatrical Dining',
      category: 'Dining',
      season: 'Autumn & Winter',
      description: 'Prime Japanese Wagyu and line-caught seafood grilled over Kishu binchotan charcoal in an open culinary theater.',
    },
  ],

  // Bulgari Hotel Tokyo
  15292: [
    {
      title: 'Il Ristorante - Niko Romito 3-Star Tasting Menu',
      category: 'Dining',
      season: 'Year-round',
      description: 'High-altitude contemporary Italian gastronomy paired with sweeping Tokyo and Mount Fuji panoramas on the 40th floor.',
    },
    {
      title: '25-Metre Gold-Mosaic Skyline Pool Sanctuary',
      category: 'Wellness',
      season: 'Winter & Spring',
      description: 'Swim beneath soaring glass skylights with heated vitality pools overlooking the Imperial Palace gardens.',
    },
    {
      title: 'Nihombashi Historic Artisan Workshop Tour',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Private visits to Edo-period lacquer masters, washi papermakers, and traditional kimono weavers.',
    },
  ],

  // Banyan Tree Higashiyama Kyoto
  15303: [
    {
      title: 'Sacred Spring Onsen & Bamboo Grove Meditation',
      category: 'Wellness',
      season: 'Autumn & Winter',
      description: 'Restorative geothermal mineral baths fed by the property’s natural mountain spring amid towering bamboo.',
    },
    {
      title: 'On-Site Noh Stage Traditional Theater Performance',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Exclusive ceremonial Noh masked drama performed on the resort’s dedicated wooden stage over the spring.',
    },
    {
      title: 'Kiyomizu-dera Dawn Pilgrimage Walk',
      category: 'Nature',
      season: 'Spring & Autumn',
      description: 'Sunrise walking trail through ancient cedar forests reaching the historic temple before visitor gates open.',
    },
  ],

  // Bellagio Shanghai
  4058: [
    {
      title: 'LAGO by Julian Serrano Terraced Italian Dining',
      category: 'Dining',
      season: 'Spring & Autumn',
      description: 'Avant-garde Italian plates on an expansive glass outdoor terrace overlooking Suzhou Creek and the Pudong skyline.',
    },
    {
      title: 'North Bund Art & Architectural Heritage Walk',
      category: 'Culture',
      season: 'Spring & Autumn',
      description: 'Curatorial tour through 1930s Shikumen brick alleyways, colonial river wharves, and cutting-edge art galleries.',
    },
    {
      title: 'Bellagio Spa Crushed Gemstone Hydrotherapy',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Rejuvenating skin therapy utilizing diamond dust, thermal steam suites, and Vitality hydro-massage pools.',
    },
  ],

  // The St. Regis Al Mouj Muscat Resort
  15283: [
    {
      title: 'Daymaniyat Islands Coral Snorkeling & Turtle Safari',
      category: 'Water',
      season: 'Oct – Apr',
      description: 'Private yacht charter to protected nature reserves with crystal turquoise waters, reef sharks, and sea turtles.',
    },
    {
      title: 'Guerlain Spa Royal Frankincense Hammam',
      category: 'Wellness',
      season: 'Nov – Mar',
      description: 'Arabian wellness ritual featuring pure Omani green Hojari frankincense, eucalyptus steam, and rosewater.',
    },
    {
      title: 'Wahiba Sands Golden Dune Bashing & Stargazing',
      category: 'Adventure',
      season: 'Oct – Apr',
      description: '4x4 desert adventure across undulating red dunes followed by private Bedouin campfire dinner under clear constellations.',
    },
  ],

  // The Lana, Dorchester Collection
  15284: [
    {
      title: 'Jara by Martín Berasategui Basque Masterclass',
      category: 'Dining',
      season: 'Nov – Apr',
      description: 'Celebrated 12-Michelin-star Basque grill artistry featuring Cantabrian seafood and vintage Rioja pairings.',
    },
    {
      title: 'Dior Spa High-Altitude Skyline Sanctuary',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Bespoke French couture therapies and anti-gravity cocoon treatments on the 29th floor overlooking Burj Khalifa.',
    },
    {
      title: 'Marasi Bay Marina Private Riva Boat Cruise',
      category: 'Water',
      season: 'Oct – Apr',
      description: 'Glide down Dubai Canal into the open Arabian Gulf aboard a handcrafted mahogany Italian Riva launch.',
    },
  ],

  // The Emory
  15288: [
    {
      title: 'Surrenne 4-Floor Longevity & Health Sanctuary',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Subterranean retreat featuring hyperbaric oxygen chambers, 22-metre pool, and custom cellular health diagnostics.',
    },
    {
      title: 'abc viñetas by Jean-Georges Farm-to-Table',
      category: 'Dining',
      season: 'Year-round',
      description: 'Vibrant Latin-inspired dishes celebrating seasonal organic British produce and sustainably sourced seafood.',
    },
    {
      title: 'Hyde Park Private Equestrian & Serpentine Walk',
      category: 'Nature',
      season: 'Spring & Summer',
      description: 'Morning horseback hack down Rotten Row and private viewing access at the Serpentine contemporary galleries.',
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
  ],

  // Constance Moofushi
  4129: [
    {
      title: 'South Ari Whale Shark & Manta Ray Snorkeling',
      category: 'Water',
      season: 'Dec – Apr',
      description: 'World-renowned open-water encounters with resident whale sharks and oceanic manta cleaning stations.',
    },
    {
      title: 'Overwater Glass-Floor Pavilion Spa Ritual',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Rejuvenating sea salt massages while watching coral reef sharks and blue tangs glide beneath the treatment table.',
    },
    {
      title: 'Sunset Dolphin Catamaran Champagne Cruise',
      category: 'Adventure',
      season: 'Dec – Apr',
      description: 'Toast golden hour with vintage Champagne as pods of spinner dolphins leap alongside the twin hulls.',
    },
  ],

  // Regent Bali Canggu
  15278: [
    {
      title: 'Regent Spa Balinese Herbal Boreh & Sound Healing',
      category: 'Wellness',
      season: 'Apr – Oct',
      description: 'Traditional clove and ginger warming wraps accompanied by Tibetan singing bowls in oceanfront pavilions.',
    },
    {
      title: 'Echo Beach Sunset Private Surf Coaching',
      category: 'Water',
      season: 'May – Sep',
      description: 'Tailored instruction on Bali’s premier reef breaks with dedicated surf photography and video analysis.',
    },
    {
      title: 'Tanah Lot Sea Temple Twilight Blessing',
      category: 'Culture',
      season: 'May – Sep',
      description: 'Private spiritual floral blessing and canang sari offering away from crowds as the sun sets over the ocean shrine.',
    },
  ],

  // One&Only Kéa Island
  15295: [
    {
      title: 'HMHS Britannic Deep-Wreck Dive Expeditions',
      category: 'Water',
      season: 'May – Oct',
      description: 'Specialized deep-sea diving expeditions exploring the Aegean’s most legendary historic maritime shipwreck.',
    },
    {
      title: 'Watsu Aquatic Floating Therapy in Natural Sea Caves',
      category: 'Wellness',
      season: 'Jun – Sep',
      description: 'Weightless acoustic water bodywork held in warm saltwater tidal caverns along the Cycladic coast.',
    },
    {
      title: 'Ancient Karthea Marble Ruins Trek & Secluded Picnic',
      category: 'Culture',
      season: 'May – Jun & Sep – Oct',
      description: 'Guided mule path descent to 6th-century BC Doric temples standing right at the edge of the blue sea.',
    },
  ],

  // Rosewood Amsterdam
  15275: [
    {
      title: 'Private Electric Salon Boat Historic Canal Cruise',
      category: 'Water',
      season: 'Apr – Oct',
      description: 'Quiet cruise through the 17th-century UNESCO canal ring aboard an antique wooden craft with Dutch artisanal treats.',
    },
    {
      title: 'Rijksmuseum & Van Gogh After-Hours Curated Access',
      category: 'Culture',
      season: 'Year-round',
      description: 'Exclusive private guided viewing of The Night Watch and Sunflowers after general gallery closing.',
    },
    {
      title: 'Asaya Spa Hydrotherapy Inside the Former Palace of Justice',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Restorative contrast thermal wellness suites situated within landmark historical architecture.',
    },
  ],

  // Soneva Secret
  15293: [
    {
      title: 'Private Robinson Crusoe Deserted Sandbank Dining',
      category: 'Dining',
      season: 'Nov – Apr',
      description: 'Barefoot castaway feast prepared over open coals by your personal chef on an isolated ocean sand spit.',
    },
    {
      title: 'Nocturnal Astronomer Lagoon Reef Snorkeling',
      category: 'Adventure',
      season: 'Dec – Apr',
      description: 'Guided night safari with UV lights observing bioluminescent coral, accompanied by deep-sky telescope viewing.',
    },
    {
      title: 'Castaway Lagoon Aerial Yoga & Sound Therapy',
      category: 'Wellness',
      season: 'Nov – Apr',
      description: 'Silken hammock aerial yoga floating above the shallow turquoise waters of Haa Dhaalu Atoll.',
    },
  ],

  // Nujuma, a Ritz-Carlton Reserve
  15279: [
    {
      title: 'Pristine Red Sea Coral Barrier Reef Diving',
      category: 'Water',
      season: 'Oct – May',
      description: 'Discover virgin coral formations, hawksbill turtles, and rare pelagic species in protected marine waters.',
    },
    {
      title: 'Dark Sky Reserve Deep-Space Astronomy Safari',
      category: 'Adventure',
      season: 'Nov – Mar',
      description: 'Telescopic observation of distant galaxies under zero-light-pollution desert skies with resident astrophysicists.',
    },
    {
      title: 'Neyrah Spa Arabian Oud & Frankincense Therapy',
      category: 'Wellness',
      season: 'Oct – Apr',
      description: 'Holistic restorative therapies incorporating ancient Hijazi sea salts and fragrant wild frankincense resins.',
    },
  ],

  // Six Senses La Sagesse
  15280: [
    {
      title: 'Spice Island Single-Origin Cocoa Making',
      category: 'Nature',
      season: 'Dec – May',
      description: 'Organic bean-to-bar dark chocolate workshop with heritage Caribbean estate growers and herbalists.',
    },
    {
      title: 'Molinière Underwater Sculpture Park Snorkeling',
      category: 'Water',
      season: 'Dec – May',
      description: 'Snorkel above submerged life-sized human sculptures transformed into thriving artificial coral reefs.',
    },
    {
      title: 'Alchemy Bar Biohacking & Custom Scrub Crafting',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Blend indigenous Grenadian nutmeg, sea salt, and cocoa butter into personalized wellness therapies.',
    },
  ],

  // Mandarin Oriental Qianmen
  15294: [
    {
      title: 'Forbidden City Private Courtyard Historical Access',
      category: 'Culture',
      season: 'Sep – Nov & Apr – May',
      description: 'Exclusive historian-guided walk through restricted imperial chambers and quiet palace courtyards.',
    },
    {
      title: 'Courtyard Siheyuan Imperial Tea & Roast Duck Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Aged vintage Pu’erh teas served alongside crisp fruitwood-roasted Peking duck in a restored heritage residence.',
    },
    {
      title: 'Traditional Chinese Medicine Meridian Qi Balancing',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Acupressure, botanical foot soaks, and heated bamboo therapies inside tranquil brick hutong pavilions.',
    },
  ],

  // Raffles London at The OWO
  15282: [
    {
      title: 'Winston Churchill Old War Office Secret Chambers Tour',
      category: 'Culture',
      season: 'Year-round',
      description: 'Private tour through the historic intelligence rooms and cabinet suites where Allied strategy was forged.',
    },
    {
      title: 'Mauro Colagreco 3-Star Terroir Gastronomy',
      category: 'Dining',
      season: 'Year-round',
      description: 'Innovative seasonal dining highlighting rare British heirloom vegetables, wild herbs, and British farmsteads.',
    },
    {
      title: 'Guerlain Spa Whitehall Subterranean Pool Sanctuary',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Luxury subterranean treatments and 20-metre marble swimming pool nestled beneath the historic building.',
    },
  ],

  // Siro One Za'abeel
  15285: [
    {
      title: 'Advanced Recovery Lab Whole-Body Cryotherapy',
      category: 'Wellness',
      season: 'Year-round',
      description: 'State-of-the-art sports science recovery including sub-zero cryo chambers, infrared saunas, and lymphatic boots.',
    },
    {
      title: 'The Link Cantilever Sky Bridge Walk & Dining',
      category: 'Adventure',
      season: 'Nov – Apr',
      description: 'Walk across the world’s longest occupied cantilever structure suspended 100 metres in the Dubai sky.',
    },
    {
      title: 'AC Milan High-Performance Athletic Coaching',
      category: 'Wellness',
      season: 'Oct – Apr',
      description: 'Personalized functional biomechanics and conditioning sessions guided by international fitness trainers.',
    },
  ],

  // Faustina Palace
  15276: [
    {
      title: 'Hagia Sophia & Basilica Cistern Dawn Walk',
      category: 'Culture',
      season: 'Apr – May & Sep – Oct',
      description: 'Early morning private tour through Byzantine domes, golden mosaics, and silent subterranean columns.',
    },
    {
      title: 'Historic 16th-Century Ottoman Hammam Bathing',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Authentic warm marble kese exfoliation and fragrant castile olive soap cloud foam therapy.',
    },
    {
      title: 'Bosphorus Strait Private Sunset Yacht Navigation',
      category: 'Water',
      season: 'May – Oct',
      description: 'Private cruise separating Europe and Asia past Ottoman waterfront yalı mansions and medieval fortress walls.',
    },
  ],

  // The Dunlin, Auberge Resorts Collection
  15286: [
    {
      title: 'Kiawah River Bottlenose Dolphin Strand-Feeding Safari',
      category: 'Nature',
      season: 'Apr – Oct',
      description: 'Observe the rare, wild behavior of local dolphins herding fish onto salt marsh mudflats from a flatboat skiff.',
    },
    {
      title: 'Lowcountry Salt Marsh Kayaking & Blue Crabbing',
      category: 'Adventure',
      season: 'Mar – Nov',
      description: 'Paddle winding cordgrass creeks and harvest fresh blue crabs under the guidance of resident naturalists.',
    },
    {
      title: 'Live Oak Oyster Roast & Bourbon Tasting Under Spanish Moss',
      category: 'Dining',
      season: 'Oct – Apr',
      description: 'Traditional wood-fired coastal oyster steam bake with local small-batch bourbon beside the riverbank.',
    },
  ],

  // Surrenne at The Emory
  15291: [
    {
      title: 'Epigenetic Biomarker & Cellular Health Consultation',
      category: 'Wellness',
      season: 'Year-round',
      description: 'In-depth physiological assessments and bespoke longevity planning with premier functional medical clinicians.',
    },
    {
      title: 'Tracy Anderson Method Private Conditioning Studio',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Targeted micro-muscle conditioning and dance cardio in London’s exclusive bespoke TA studio.',
    },
    {
      title: 'Magnesium Sound Floatation & Hydrotherapy',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Acoustic sensory-deprivation floatation therapy in mineral-dense pools calibrated for deep nervous system rest.',
    },
  ],

  // Domes Tierra Glamping
  15281: [
    {
      title: 'Maras Salt Pans & Moray Incan Amphitheater Quad Safari',
      category: 'Adventure',
      season: 'May – Sep',
      description: 'Ride quad bikes across Andean highlands visiting millennia-old pink salt evaporation pools and agricultural terracing.',
    },
    {
      title: 'Pachamama Sacred Earth Ceremony & Shaman Blessing',
      category: 'Culture',
      season: 'May – Sep',
      description: 'Authentic Quechua spiritual ceremony offering flowers and coca leaves to honor Mother Earth with an Andean paqo.',
    },
    {
      title: 'Ancestral Huatia Underground Earth Oven Feast',
      category: 'Dining',
      season: 'Apr – Oct',
      description: 'Traditional highland cooking method baking native Andean potatoes and herbs beneath heated earth and clay clods.',
    },
  ],

  // Habitas Santa Teresa
  15277: [
    {
      title: 'Playa Hermosa Point-Break Surf Coaching',
      category: 'Water',
      season: 'Dec – Apr',
      description: 'Personalized surf instruction along Costa Rica’s world-renowned breaks paired with beach video review.',
    },
    {
      title: 'Jungle Canopy Shamanic Breathwork & Gong Sound Bath',
      category: 'Wellness',
      season: 'Dec – Apr',
      description: 'Restorative acoustic sound frequencies and guided breathwork surrounded by tropical palms and sea breezes.',
    },
    {
      title: 'Cabo Blanco Nature Reserve Bio-Diverse Trek',
      category: 'Nature',
      season: 'Dec – Apr',
      description: 'Guided natural history hike through Costa Rica’s oldest protected wildlife reserve spotting howler monkeys and toucans.',
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
  ],

  // Six Senses Crans-Montana
  15287: [
    {
      title: 'Direct Ski-In / Ski-Out Valais Glacier Access',
      category: 'Snow',
      season: 'Dec – Apr',
      description: 'Immediate slope access to 140 kilometres of groomed alpine pistes and the 3,000-metre Plaine Morte glacier.',
    },
    {
      title: 'Alpine Biohacking, Snow Plunge & Finnish Sauna',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Contrast thermal therapy matching hot timber saunas with natural snow immersion and red-light restoration.',
    },
    {
      title: 'High-Alpine Meadow Cheese & Glacier Trekking',
      category: 'Adventure',
      season: 'Jul – Sep',
      description: 'Summer alpine flower hike to historic mountain chalets for traditional wood-melted Valais raclette.',
    },
  ],

  // Wilderness Hotel Muotka
  520: [
    {
      title: 'Urho Kekkonen National Park Aurora Snowmobile Safari',
      category: 'Snow',
      season: 'Dec – Mar',
      description: 'Ride modern snowmobiles across frozen fell ridges and silent pine forests searching for the Northern Lights.',
    },
    {
      title: 'Riverside Smoke Sauna & Arctic Ice Dip',
      category: 'Wellness',
      season: 'Nov – Apr',
      description: 'Classic Finnish savusauna heated with birch logs followed by a thrilling cold-water plunge in the Muotka stream.',
    },
    {
      title: 'Wild Taiga Snowshoe Trek & Campfire Berry Tea',
      category: 'Snow',
      season: 'Dec – Apr',
      description: 'Snowshoe through deep powder beneath snow-laden pine boughs and brew warm lingonberry juice over open embers.',
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
  ],

  // Arctic TreeHouse Hotel
  5156: [
    {
      title: 'Floor-to-Ceiling Glass Northern Lights Observation',
      category: 'Snow',
      season: 'Sep – Apr',
      description: 'Watch green auroral ribbons illuminate the Arctic night from your plush bed through heated panoramic glass suites.',
    },
    {
      title: 'Santa Claus Secret Forest Private Fairytale Experience',
      category: 'Culture',
      season: 'Nov – Jan',
      description: 'Private woodland lantern journey to meet Santa, bake gingerbread with forest elves, and craft wooden toys.',
    },
    {
      title: 'Raksa Arctic Wild Game & Cloudberry Degustation',
      category: 'Dining',
      season: 'Year-round',
      description: 'Gastronomic menu spotlighting King crab, smoked venison, spruce shoots, and rare golden Arctic berries.',
    },
  ],

  // Explora Valle Sagrado
  3234: [
    {
      title: 'Machu Picchu & Incan Citadel Small-Group Expedition',
      category: 'Adventure',
      season: 'May – Sep',
      description: 'Privately guided expedition across ancient Incan trails to the iconic lost citadel with expert field guides.',
    },
    {
      title: 'Ollantaytambo Fortress & Living Incan Canal Walk',
      category: 'Culture',
      season: 'May – Sep',
      description: 'Explore megalithic sun temples and walk cobblestone streets that have housed Quechua families continuously since 1440.',
    },
    {
      title: 'Pumacahua 17th-Century Colonial Spa & Thermal Pools',
      category: 'Wellness',
      season: 'Year-round',
      description: 'Unwind in heated outdoor pools within a preserved Spanish colonial hacienda overlooking terraced cornfields.',
    },
  ],

  // Tierra Patagonia
  3404: [
    {
      title: 'Torres del Paine Baqueano Gaucho Horseback Ride',
      category: 'Adventure',
      season: 'Nov – Mar',
      description: 'Canter across windswept Patagonian steppes alongside authentic local horsemen with views of the granite towers.',
    },
    {
      title: 'Lake Sarmiento Wild Puma Tracking & Guanaco Safari',
      category: 'Nature',
      season: 'Nov – Mar',
      description: 'Specialized dawn wildlife excursion tracking apex predators and guanaco herds with telephoto binoculars.',
    },
    {
      title: 'Uma Spa Hydro-Jet Infinity Pool Overlooking Paine Massif',
      category: 'Wellness',
      season: 'Oct – Apr',
      description: 'Warm hydrotherapy soak encased in floor-to-ceiling glass gazing across Lake Sarmiento to the dramatic mountains.',
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
  const fallback = RESORT_PRICE_RANGES[pinId];
  const min = typeof pinPrice === 'number' && pinPrice > 0 ? pinPrice : fallback?.min;
  const max = typeof pinMaxPrice === 'number' && pinMaxPrice > 0 ? pinMaxPrice : fallback?.max;
  const currency = pinCurrency ?? fallback?.currency ?? 'USD';
  return formatPricePerNight(min, max, currency);
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

