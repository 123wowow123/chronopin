import { redirect } from '@/lib/i18n/server';

// The portal is the Ads tab of the profile; this address stays for the ad tile
// that links here and for links people saved.
export default async function AdvertiseRedirect({ searchParams }: { searchParams: Promise<{ paid?: string; edit?: string }> }) {
  const { paid, edit } = await searchParams;
  const query = new URLSearchParams();
  if (paid) query.set('paid', paid);
  if (edit) query.set('edit', edit);
  return redirect(`/profile/ads${query.size ? `?${query}` : ''}`);
}
