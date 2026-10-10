import Holidays from 'date-holidays';
import { restaurantSourceKey, type RestaurantMenuProfile } from '@/lib/restaurantMenus';
import type { RestaurantOffer } from '@/lib/restaurantOffers';
import type { Restaurant, TopRestaurant } from '@/lib/restaurants';
import { pinPath } from '@/lib/seo';
import { listSpecialVenues, type RestaurantSpecialVenue } from '@/server/model/restaurantSpecialVenue';

type SpecialVenue = RestaurantMenuProfile & { regionSlug: string; neighborhood: string; address: string; websiteUrl: string };

export async function regionalRestaurantOffers(restaurants: Restaurant[], topRestaurants: TopRestaurant[], today: string, regionSlug?: string): Promise<RestaurantOffer[]> {
  return buildRestaurantOffers(restaurants, topRestaurants, today, regionSlug, await listSpecialVenues());
}

export function buildRestaurantOffers(restaurants: Restaurant[], topRestaurants: TopRestaurant[], today: string, regionSlug: string | undefined, records: RestaurantSpecialVenue[]): RestaurantOffer[] {
  const profiles = records.filter((record) => record.enabled);
  const supplemental = profiles.filter((record) => record.regionSlug === regionSlug).map((record) => ({ ...record.profile, regionSlug: record.regionSlug })) as SpecialVenue[];
  const venues = [
    ...restaurants.filter((restaurant) => restaurant.confirmed && restaurant.day <= today).map((restaurant) => ({ ...restaurant, href: pinPath(restaurant) })),
    ...topRestaurants.map((restaurant) => ({ ...restaurant, href: pinPath({ id: restaurant.pinId, title: restaurant.pinTitle }) })),
    ...supplemental.map((venue) => ({ ...venue, sourceUrl: venue.pinSourceUrl, href: venue.websiteUrl })),
  ];
  const seen = new Set<string>();
  return venues.flatMap((venue) => {
    const profile = profiles.find((record) => restaurantSourceKey(record.profile.pinSourceUrl) === restaurantSourceKey(venue.sourceUrl ?? ''))?.profile;
    if (!profile || seen.has(profile.pinSourceUrl)) return [];
    seen.add(profile.pinSourceUrl);
    return profile.specials.flatMap((special, index) => {
      if (!special.discounted || !special.availability) return [];
      let availability = special.availability!;
      if (availability.excludesHolidays) {
        // Resolve only calendars confirmed for these branch-specific promotions.
        // With no branch-specific calendar, leave the offer unresolved/hidden.
        const californiaPromotion = [
          'https://www.telefericbarcelona.com/lajolla',
          'https://cloakandpetal.com/',
          'https://www.opentable.com/restaurant/profile/2811', // ROCK’N FISH Manhattan Beach
          'https://www.opentable.com/restaurant/profile/3973', // Il Fornaio Del Mar
        ].includes(profile.pinSourceUrl);
        const japanPromotion = [
          'https://osaka.hiltonjapan.co.jp/plans/restaurants/other/myplace-happyhour',
          'https://www.herofield.com/bbq/tokyoprince/',
        ].includes(profile.pinSourceUrl);
        const taiwanPromotion = [
          'https://www.smithandwollensky.com.tw/en/menu/taipei',
          'https://www.smithandwollensky.com.tw/en/menu/taichung',
        ].includes(profile.pinSourceUrl);
        if (californiaPromotion || japanPromotion || taiwanPromotion) {
          const holidays = taiwanPromotion ? new Holidays('TW') : japanPromotion ? new Holidays('JP') : new Holidays('US', 'ca');
          if (taiwanPromotion) {
            // The bundled TW rules predate the 2025 holiday restoration and omit
            // Saturday substitutes. DGPA publishes the current statutory dates:
            // https://www.dgpa.gov.tw/information?fid=9898&pid=12982&uid=30
            for (const date of ['01-01', '02-28', '04-04', '05-01', '09-28', '10-10', '10-25', '12-25']) {
              holidays.setHoliday(`${date} and if Saturday then previous Friday if Sunday then next Monday`, { name: 'Taiwan public holiday', type: 'public', substitute: true });
            }
            holidays.setHoliday('1 day before chinese 01-0-00', { name: 'Day before Lunar New Year’s Eve', type: 'public' });
          }
          const year = Number(today.slice(0, 4));
          const excludedDates = [year - 1, year, year + 1].flatMap((year) => holidays.getHolidays(year).filter((holiday) => holiday.type === 'public').map((holiday) => holiday.date.slice(0, 10)));
          availability = { ...availability, excludedDates: [...new Set([...availability.excludedDates ?? [], ...excludedDates])] };
        }
      }
      const menu = profile.menus.find((menu) => menu.label === special.menuLabel);
      return {
        id: `${profile.pinSourceUrl}#${index}`, name: venue.name, neighborhood: venue.neighborhood, address: venue.address,
        restaurantHref: venue.href, checkedAt: profile.checkedAt, special: { ...special, availability },
        review: profile.review,
        photo: profile.photo,
        location: profile.location,
        menu: menu ? { ...menu, items: menu.items.filter((item) => !special.excludedMenuItems?.includes(item.name)) } : undefined,
      };
    });
  });
}
