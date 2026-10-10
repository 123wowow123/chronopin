import { redirect } from '@/lib/i18n/server';

// Country entry follows the first supported city in west-to-east navigation.
export default async function TaiwanRestaurantsPage() {
  await redirect('/restaurants/kaohsiung');
}
