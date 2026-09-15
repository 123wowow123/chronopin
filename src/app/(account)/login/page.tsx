import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-md p-6 shadow-2xl shadow-black/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 mb-6 text-sm text-subtle">Log in to watch pins, follow people and post your own.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
