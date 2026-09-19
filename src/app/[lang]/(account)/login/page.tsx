import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getT } from '@/lib/i18n/server';
import { LoginForm } from './LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('account.loginTitle') };
}

export default async function LoginPage() {
  const t = await getT();
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-md p-6 shadow-2xl shadow-shade/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('account.welcomeBack')}</h1>
        <p className="mt-1 mb-6 text-sm text-subtle">{t('account.loginIntro')}</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
