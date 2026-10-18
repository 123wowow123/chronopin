import { redirect } from '@/lib/i18n/server';

// /person on its own has no page: the index of people is /people.
export default async function PersonIndex() {
  await redirect('/people');
}
