import type { Metadata } from 'next';
import { Suspense } from 'react';
import { afterLoginPath } from '@/lib/authRedirect';
import { getT, redirect } from '@/lib/i18n/server';
import { requireViewer } from '@/server/guard';
import { BirthdayForm } from './BirthdayForm';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between
// its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('signup.birthdayTitle') };
}

// The one question a provider cannot answer. Sign-in through Google, Facebook
// or Apple lands here the first time it opens an account (src/server/oauth.ts)
// and nowhere else: answering or skipping goes on to wherever the sign-in was
// headed. Somebody who already has a birthday - anyone who came the long way
// round, or came back to this URL - is sent straight on.
export default async function SignupBirthdayPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await requireViewer('/signup/birthday');
  const next = afterLoginPath((await searchParams).redirect);
  if (user.birthday) {
    return redirect(next);
  }
  const t = await getT();
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-lg p-6 shadow-2xl shadow-shade/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('signup.birthdayTitle')}</h1>
        <p className="mt-1 mb-6 text-sm text-subtle">{t('signup.birthdayWelcome', { user: user.userName })}</p>
        <Suspense>
          <BirthdayForm next={next} />
        </Suspense>
      </div>
    </div>
  );
}
