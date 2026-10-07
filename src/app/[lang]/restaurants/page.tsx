import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/i18n/server';
import { localizePath } from '@/lib/i18n/config';

export default async function RestaurantsPage() {
  redirect(localizePath('/restaurants/san-diego', await getLocale()));
}
