import type { NextRequest } from 'next/server';
import { GUIDE_PAGE_SIZE, GUIDE_VIEWS, type GuideQuery, type GuideView } from '@/lib/restaurantGuide';
import type { RestaurantSort } from '@/lib/restaurantSort';
import { json, route } from '@/server/http';
import { guidePage } from '@/server/services/restaurantGuidePage';

const SORTS: RestaurantSort[] = ['rating', 'distance', 'opening-date', 'lunch'];

// One page of a restaurant guide list: ?region=&view=upcoming|new|top|discounts
// [&section=available|next]&neighborhood=&sort=rating|distance|opening-date
// [&lat=&lon=]&offset=. Answers { items, total, ids, bounds?, details }.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const view = params.get('view') as GuideView;
  const offset = Math.floor(Number(params.get('offset') ?? 0));
  if (!GUIDE_VIEWS.includes(view) || !(offset >= 0)) return new Response(null, { status: 400 });
  const lat = Number(params.get('lat')); const lon = Number(params.get('lon'));
  const sort = SORTS.find((item) => item === params.get('sort')) ?? 'rating';
  const query: GuideQuery = {
    region: params.get('region') ?? '', view, sort, neighborhood: params.get('neighborhood') || 'all',
    section: params.get('section') === 'next' ? 'next' : view === 'discounts' ? 'available' : undefined,
    origin: params.get('lat') && params.get('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { latitude: lat, longitude: lon } : undefined,
  };
  const page = await guidePage(query, offset, new Date(), GUIDE_PAGE_SIZE);
  return page ? json(page, 200, { 'Cache-Control': 'private, no-store' }) : new Response(null, { status: 404 });
});
