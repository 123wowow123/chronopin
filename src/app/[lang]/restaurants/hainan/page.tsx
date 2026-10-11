import { redirect } from '@/lib/i18n/server';

// Hainan entry opens its westernmost supported city; Haikou is in China navigation.
export default async function HainanRestaurantsPage() {
  await redirect('/restaurants/sanya');
}
