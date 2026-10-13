import { distanceKm, type Place } from './distance';

// City navigation runs west to east by city-center longitude.
export const RESTAURANT_REGIONS = [
  { slug: 'honolulu', name: 'Honolulu', country: 'United States', state: 'Hawaii', timeZone: 'Pacific/Honolulu', latitude: 21.3099, longitude: -157.8581 },
  { slug: 'victoria', name: 'Victoria', country: 'Canada', state: 'British Columbia', timeZone: 'America/Vancouver', latitude: 48.4284, longitude: -123.3656 },
  { slug: 'vancouver', name: 'Vancouver', country: 'Canada', state: 'British Columbia', timeZone: 'America/Vancouver', latitude: 49.2827, longitude: -123.1207 },
  { slug: 'san-francisco', name: 'San Francisco', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  { slug: 'seattle', name: 'Seattle', country: 'United States', state: 'Washington', timeZone: 'America/Los_Angeles', latitude: 47.6062, longitude: -122.3321 },
  { slug: 'san-jose', name: 'San Jose', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 37.3382, longitude: -121.8863 },
  { slug: 'sacramento', name: 'Sacramento', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 38.5816, longitude: -121.4944 },
  { slug: 'los-angeles', name: 'Los Angeles', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { slug: 'san-diego', name: 'San Diego', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 32.7157, longitude: -117.1611 },
  { slug: 'palm-springs', name: 'Palm Springs', country: 'United States', state: 'California', timeZone: 'America/Los_Angeles', latitude: 33.8303, longitude: -116.5453 },
  { slug: 'las-vegas', name: 'Las Vegas', country: 'United States', state: 'Nevada', timeZone: 'America/Los_Angeles', latitude: 36.1699, longitude: -115.1398 },
  { slug: 'calgary', name: 'Calgary', country: 'Canada', state: 'Alberta', timeZone: 'America/Edmonton', latitude: 51.0447, longitude: -114.0719 },
  { slug: 'edmonton', name: 'Edmonton', country: 'Canada', state: 'Alberta', timeZone: 'America/Edmonton', latitude: 53.5461, longitude: -113.4938 },
  { slug: 'phoenix', name: 'Phoenix', country: 'United States', state: 'Arizona', timeZone: 'America/Phoenix', latitude: 33.4484, longitude: -112.074 },
  { slug: 'saskatoon', name: 'Saskatoon', country: 'Canada', state: 'Saskatchewan', timeZone: 'America/Regina', latitude: 52.1332, longitude: -106.67 },
  { slug: 'guadalajara', name: 'Guadalajara', country: 'Mexico', state: 'Jalisco', timeZone: 'America/Mexico_City', latitude: 20.6597, longitude: -103.3496 },
  { slug: 'monterrey', name: 'Monterrey', country: 'Mexico', state: 'Nuevo León', timeZone: 'America/Monterrey', latitude: 25.6866, longitude: -100.3161 },
  { slug: 'mexico-city', name: 'Mexico City', country: 'Mexico', state: 'Mexico City', timeZone: 'America/Mexico_City', latitude: 19.4326, longitude: -99.1332 },
  { slug: 'san-antonio', name: 'San Antonio', country: 'United States', state: 'Texas', timeZone: 'America/Chicago', latitude: 29.4241, longitude: -98.4936 },
  { slug: 'austin', name: 'Austin', country: 'United States', state: 'Texas', timeZone: 'America/Chicago', latitude: 30.2672, longitude: -97.7431 },
  { slug: 'fort-worth', name: 'Fort Worth', country: 'United States', state: 'Texas', timeZone: 'America/Chicago', latitude: 32.7555, longitude: -97.3308 },
  { slug: 'winnipeg', name: 'Winnipeg', country: 'Canada', state: 'Manitoba', timeZone: 'America/Winnipeg', latitude: 49.8951, longitude: -97.1384 },
  { slug: 'dallas', name: 'Dallas', country: 'United States', state: 'Texas', timeZone: 'America/Chicago', latitude: 32.7767, longitude: -96.797 },
  { slug: 'houston', name: 'Houston', country: 'United States', state: 'Texas', timeZone: 'America/Chicago', latitude: 29.7604, longitude: -95.3698 },
  { slug: 'chicago', name: 'Chicago', country: 'United States', state: 'Illinois', timeZone: 'America/Chicago', latitude: 41.8781, longitude: -87.6298 },
  { slug: 'nashville', name: 'Nashville', country: 'United States', state: 'Tennessee', timeZone: 'America/Chicago', latitude: 36.1627, longitude: -86.7816 },
  { slug: 'atlanta', name: 'Atlanta', country: 'United States', state: 'Georgia', timeZone: 'America/New_York', latitude: 33.749, longitude: -84.388 },
  { slug: 'columbus', name: 'Columbus', country: 'United States', state: 'Ohio', timeZone: 'America/New_York', latitude: 39.9612, longitude: -82.9988 },
  { slug: 'jacksonville', name: 'Jacksonville', country: 'United States', state: 'Florida', timeZone: 'America/New_York', latitude: 30.3322, longitude: -81.6557 },
  { slug: 'orlando', name: 'Orlando', country: 'United States', state: 'Florida', timeZone: 'America/New_York', latitude: 28.5383, longitude: -81.3792 },
  { slug: 'charlotte', name: 'Charlotte', country: 'United States', state: 'North Carolina', timeZone: 'America/New_York', latitude: 35.2271, longitude: -80.8431 },
  { slug: 'miami', name: 'Miami', country: 'United States', state: 'Florida', timeZone: 'America/New_York', latitude: 25.7617, longitude: -80.1918 },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale', country: 'United States', state: 'Florida', timeZone: 'America/New_York', latitude: 26.1224, longitude: -80.1373 },
  { slug: 'hamilton', name: 'Hamilton', country: 'Canada', state: 'Ontario', timeZone: 'America/Toronto', latitude: 43.2557, longitude: -79.8711 },
  { slug: 'toronto', name: 'Toronto', country: 'Canada', state: 'Ontario', timeZone: 'America/Toronto', latitude: 43.6532, longitude: -79.3832 },
  { slug: 'washington-dc', name: 'Washington, DC', country: 'United States', state: 'District of Columbia', timeZone: 'America/New_York', latitude: 38.9072, longitude: -77.0369 },
  { slug: 'ottawa', name: 'Ottawa', country: 'Canada', state: 'Ontario', timeZone: 'America/Toronto', latitude: 45.4215, longitude: -75.6972 },
  { slug: 'philadelphia', name: 'Philadelphia', country: 'United States', state: 'Pennsylvania', timeZone: 'America/New_York', latitude: 39.9526, longitude: -75.1652 },
  { slug: 'new-york', name: 'New York', country: 'United States', state: 'New York', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { slug: 'montreal', name: 'Montréal', country: 'Canada', state: 'Quebec', timeZone: 'America/Toronto', latitude: 45.5019, longitude: -73.5674 },
  { slug: 'quebec-city', name: 'Québec City', country: 'Canada', state: 'Quebec', timeZone: 'America/Toronto', latitude: 46.8139, longitude: -71.208 },
  { slug: 'boston', name: 'Boston', country: 'United States', state: 'Massachusetts', timeZone: 'America/New_York', latitude: 42.3601, longitude: -71.0589 },
  { slug: 'halifax', name: 'Halifax', country: 'Canada', state: 'Nova Scotia', timeZone: 'America/Halifax', latitude: 44.6488, longitude: -63.5752 },
  { slug: 'lisbon', name: 'Lisbon', country: 'Portugal', state: 'Portugal', timeZone: 'Europe/Lisbon', latitude: 38.7223, longitude: -9.1393 },
  { slug: 'dublin', name: 'Dublin', country: 'Ireland', state: 'Ireland', timeZone: 'Europe/Dublin', latitude: 53.3498, longitude: -6.2603 },
  { slug: 'madrid', name: 'Madrid', country: 'Spain', state: 'Spain', timeZone: 'Europe/Madrid', latitude: 40.4168, longitude: -3.7038 },
  { slug: 'london', name: 'London', country: 'United Kingdom', state: 'United Kingdom', timeZone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
  { slug: 'barcelona', name: 'Barcelona', country: 'Spain', state: 'Spain', timeZone: 'Europe/Madrid', latitude: 41.3874, longitude: 2.1686 },
  { slug: 'paris', name: 'Paris', country: 'France', state: 'France', timeZone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522 },
  { slug: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', state: 'Netherlands', timeZone: 'Europe/Amsterdam', latitude: 52.3676, longitude: 4.9041 },
  { slug: 'rome', name: 'Rome', country: 'Italy', state: 'Italy', timeZone: 'Europe/Rome', latitude: 41.9028, longitude: 12.4964 },
  { slug: 'copenhagen', name: 'Copenhagen', country: 'Denmark', state: 'Denmark', timeZone: 'Europe/Copenhagen', latitude: 55.6761, longitude: 12.5683 },
  { slug: 'berlin', name: 'Berlin', country: 'Germany', state: 'Germany', timeZone: 'Europe/Berlin', latitude: 52.52, longitude: 13.405 },
  { slug: 'vienna', name: 'Vienna', country: 'Austria', state: 'Austria', timeZone: 'Europe/Vienna', latitude: 48.2082, longitude: 16.3738 },
  { slug: 'stockholm', name: 'Stockholm', country: 'Sweden', state: 'Sweden', timeZone: 'Europe/Stockholm', latitude: 59.3293, longitude: 18.0686 },
  { slug: 'kunming', name: 'Kunming', country: 'China', state: 'Yunnan', timeZone: 'Asia/Shanghai', latitude: 25.0389, longitude: 102.7183 },
  { slug: 'chengdu', name: 'Chengdu', country: 'China', state: 'Sichuan', timeZone: 'Asia/Shanghai', latitude: 30.5728, longitude: 104.0665 },
  { slug: 'chongqing', name: 'Chongqing', country: 'China', state: 'Chongqing', timeZone: 'Asia/Shanghai', latitude: 29.563, longitude: 106.5516 },
  { slug: 'xian', name: 'Xi’an', country: 'China', state: 'Shaanxi', timeZone: 'Asia/Shanghai', latitude: 34.3416, longitude: 108.9398 },
  { slug: 'sanya', name: 'Sanya', country: 'China', state: 'Hainan', timeZone: 'Asia/Shanghai', latitude: 18.2528, longitude: 109.5119 },
  { slug: 'haikou', name: 'Haikou', country: 'China', state: 'Hainan', timeZone: 'Asia/Shanghai', latitude: 20.044, longitude: 110.1999 },
  { slug: 'changsha', name: 'Changsha', country: 'China', state: 'Hunan', timeZone: 'Asia/Shanghai', latitude: 28.2282, longitude: 112.9388 },
  { slug: 'foshan', name: 'Foshan', country: 'China', state: 'Guangdong', timeZone: 'Asia/Shanghai', latitude: 23.0215, longitude: 113.1214 },
  { slug: 'guangzhou', name: 'Guangzhou', country: 'China', state: 'Guangdong', timeZone: 'Asia/Shanghai', latitude: 23.1291, longitude: 113.2644 },
  { slug: 'zhengzhou', name: 'Zhengzhou', country: 'China', state: 'Henan', timeZone: 'Asia/Shanghai', latitude: 34.7466, longitude: 113.6254 },
  { slug: 'dongguan', name: 'Dongguan', country: 'China', state: 'Guangdong', timeZone: 'Asia/Shanghai', latitude: 23.0207, longitude: 113.7518 },
  { slug: 'shenzhen', name: 'Shenzhen', country: 'China', state: 'Guangdong', timeZone: 'Asia/Shanghai', latitude: 22.5431, longitude: 114.0579 },
  { slug: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', state: 'Hong Kong', timeZone: 'Asia/Hong_Kong', latitude: 22.3193, longitude: 114.1694 },
  { slug: 'wuhan', name: 'Wuhan', country: 'China', state: 'Hubei', timeZone: 'Asia/Shanghai', latitude: 30.5928, longitude: 114.3055 },
  { slug: 'perth', name: 'Perth', country: 'Australia', state: 'Western Australia', timeZone: 'Australia/Perth', latitude: -31.9523, longitude: 115.8613 },
  { slug: 'beijing', name: 'Beijing', country: 'China', state: 'Beijing', timeZone: 'Asia/Shanghai', latitude: 39.9042, longitude: 116.4074 },
  { slug: 'jinan', name: 'Jinan', country: 'China', state: 'Shandong', timeZone: 'Asia/Shanghai', latitude: 36.6512, longitude: 117.1201 },
  { slug: 'hefei', name: 'Hefei', country: 'China', state: 'Anhui', timeZone: 'Asia/Shanghai', latitude: 31.8206, longitude: 117.2272 },
  { slug: 'tianjin', name: 'Tianjin', country: 'China', state: 'Tianjin', timeZone: 'Asia/Shanghai', latitude: 39.3434, longitude: 117.3616 },
  { slug: 'xiamen', name: 'Xiamen', country: 'China', state: 'Fujian', timeZone: 'Asia/Shanghai', latitude: 24.4798, longitude: 118.0894 },
  { slug: 'nanjing', name: 'Nanjing', country: 'China', state: 'Jiangsu', timeZone: 'Asia/Shanghai', latitude: 32.0603, longitude: 118.7969 },
  { slug: 'hangzhou', name: 'Hangzhou', country: 'China', state: 'Zhejiang', timeZone: 'Asia/Shanghai', latitude: 30.2741, longitude: 120.1551 },
  { slug: 'kaohsiung', name: 'Kaohsiung', country: 'Taiwan', state: 'Kaohsiung', timeZone: 'Asia/Taipei', latitude: 22.6273, longitude: 120.3014 },
  { slug: 'qingdao', name: 'Qingdao', country: 'China', state: 'Shandong', timeZone: 'Asia/Shanghai', latitude: 36.0671, longitude: 120.3826 },
  { slug: 'suzhou', name: 'Suzhou', country: 'China', state: 'Jiangsu', timeZone: 'Asia/Shanghai', latitude: 31.2989, longitude: 120.5853 },
  { slug: 'taichung', name: 'Taichung', country: 'Taiwan', state: 'Taichung', timeZone: 'Asia/Taipei', latitude: 24.1477, longitude: 120.6736 },
  { slug: 'shanghai', name: 'Shanghai', country: 'China', state: 'Shanghai', timeZone: 'Asia/Shanghai', latitude: 31.2304, longitude: 121.4737 },
  { slug: 'ningbo', name: 'Ningbo', country: 'China', state: 'Zhejiang', timeZone: 'Asia/Shanghai', latitude: 29.8683, longitude: 121.544 },
  { slug: 'taipei', name: 'Taipei', country: 'Taiwan', state: 'Taipei', timeZone: 'Asia/Taipei', latitude: 25.0330, longitude: 121.5654 },
  { slug: 'dalian', name: 'Dalian', country: 'China', state: 'Liaoning', timeZone: 'Asia/Shanghai', latitude: 38.914, longitude: 121.6147 },
  { slug: 'shenyang', name: 'Shenyang', country: 'China', state: 'Liaoning', timeZone: 'Asia/Shanghai', latitude: 41.8057, longitude: 123.4315 },
  { slug: 'harbin', name: 'Harbin', country: 'China', state: 'Heilongjiang', timeZone: 'Asia/Shanghai', latitude: 45.8038, longitude: 126.5349 },
  { slug: 'fukuoka', name: 'Fukuoka', country: 'Japan', state: 'Fukuoka', timeZone: 'Asia/Tokyo', latitude: 33.5902, longitude: 130.4017 },
  { slug: 'osaka', name: 'Osaka', country: 'Japan', state: 'Osaka', timeZone: 'Asia/Tokyo', latitude: 34.6937, longitude: 135.5023 },
  { slug: 'kyoto', name: 'Kyoto', country: 'Japan', state: 'Kyoto', timeZone: 'Asia/Tokyo', latitude: 35.0116, longitude: 135.7681 },
  { slug: 'nagoya', name: 'Nagoya', country: 'Japan', state: 'Aichi', timeZone: 'Asia/Tokyo', latitude: 35.1815, longitude: 136.9066 },
  { slug: 'adelaide', name: 'Adelaide', country: 'Australia', state: 'South Australia', timeZone: 'Australia/Adelaide', latitude: -34.9285, longitude: 138.6007 },
  { slug: 'tokyo', name: 'Tokyo', country: 'Japan', state: 'Tokyo', timeZone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { slug: 'sapporo', name: 'Sapporo', country: 'Japan', state: 'Hokkaido', timeZone: 'Asia/Tokyo', latitude: 43.0618, longitude: 141.3545 },
  { slug: 'melbourne', name: 'Melbourne', country: 'Australia', state: 'Victoria', timeZone: 'Australia/Melbourne', latitude: -37.8136, longitude: 144.9631 },
  { slug: 'sydney', name: 'Sydney', country: 'Australia', state: 'New South Wales', timeZone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
  { slug: 'brisbane', name: 'Brisbane', country: 'Australia', state: 'Queensland', timeZone: 'Australia/Brisbane', latitude: -27.4698, longitude: 153.0251 },
  { slug: 'christchurch', name: 'Christchurch', country: 'New Zealand', state: 'Canterbury', timeZone: 'Pacific/Auckland', latitude: -43.5321, longitude: 172.6362 },
  { slug: 'auckland', name: 'Auckland', country: 'New Zealand', state: 'Auckland', timeZone: 'Pacific/Auckland', latitude: -36.8509, longitude: 174.7645 },
  { slug: 'wellington', name: 'Wellington', country: 'New Zealand', state: 'Wellington', timeZone: 'Pacific/Auckland', latitude: -41.2866, longitude: 174.7756 },
] as const;

// Countries follow their westernmost guide city in the west-to-east region list.
export const RESTAURANT_COUNTRIES = [...new Set(RESTAURANT_REGIONS.map((region) => region.country))];

// Only supported city guides are candidates. With no usable location, use San Diego.
export function nearestRestaurantRegion(place: Place | null | undefined) {
  const fallback = RESTAURANT_REGIONS.find((region) => region.slug === 'san-diego')!;
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) return fallback;
  return RESTAURANT_REGIONS.reduce((nearest, region) =>
    distanceKm(place, region) < distanceKm(place, nearest) ? region : nearest,
  );
}

export type Restaurant = {
  id: number;
  title: string;
  name: string;
  description: string;
  day: string;
  dateLabel: string;
  estimated: boolean;
  confirmed: boolean;
  neighborhood: string;
  cuisine: string;
  image: string | null;
  imageNote: string | null;
  address: string;
  priceRange?: string;
  sourceUrl?: string | null;
};

export type OpeningGroup = 'upcoming' | 'new' | null;

export type TopRestaurant = {
  pinId: number;
  pinTitle: string;
  slug: string;
  regionSlug: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  address: string;
  description: string;
  recognition: string;
  priceRange: string;
  sourceUrl: string;
  websiteUrl: string;
  checkedAt: string;
  image: string | null;
  imageCredit: string;
};

// Passing an estimated opening date never establishes that a restaurant opened.
// All-day pin dates are calendar days; compare them with the region's local day.
export function openingGroup(restaurant: Pick<Restaurant, 'day' | 'confirmed'>, today: string): OpeningGroup {
  if (restaurant.day > today) return 'upcoming';
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - 90);
  if (restaurant.day < oldest.toISOString().slice(0, 10)) return null;
  return restaurant.confirmed ? 'new' : 'upcoming';
}

export function openingDateLabel(day: string, estimated: boolean, reason = ''): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (estimated) {
    if (/early winter/i.test(reason)) return `Early winter ${date.getUTCFullYear()}`;
    if (/early\s+\d{4}/i.test(reason)) return `Early ${date.getUTCFullYear()}`;
    if (/fall/i.test(reason) && !/October/i.test(reason)) return `Fall ${date.getUTCFullYear()}`;
    if (/late.?2026/i.test(reason)) return 'Late 2026';
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', ...(estimated ? {} : { day: 'numeric' }), year: 'numeric', timeZone: 'UTC' }).format(date);
}
