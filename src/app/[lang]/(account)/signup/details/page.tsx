import type { Metadata } from 'next';
import { Suspense } from 'react';
import { afterLoginPath } from '@/lib/authRedirect';
import { getT, redirect } from '@/lib/i18n/server';
import { requireViewer } from '@/server/guard';
import { DetailsForm } from './DetailsForm';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between
// its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('signup.detailsTitle') };
}

// The questions a provider cannot answer: birthday and phone. Sign-in through
// Google, Facebook or Apple lands here the first time it opens an account
// (src/server/oauth.ts) and nowhere else: answering or skipping goes on to
// wherever the sign-in was headed. Somebody who already has both - anyone who
// came the long way round, or came back to this URL - is sent straight on.
export default async function SignupDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await requireViewer('/signup/details');
  const next = afterLoginPath((await searchParams).redirect);
  if (user.birthday && user.phone) {
    return redirect(next);
  }
  const t = await getT();
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-lg p-6 shadow-2xl shadow-shade/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('signup.detailsTitle')}</h1>
        <p className="mt-1 mb-6 text-sm text-subtle">{t('signup.detailsWelcome', { user: user.userName })}</p>
        <Suspense>
          <DetailsForm next={next} birthday={user.birthday || ''} phone={user.phone || ''} />
        </Suspense>
      </div>
    </div>
  );
}
