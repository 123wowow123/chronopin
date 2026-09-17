import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-lg p-6 shadow-2xl shadow-shade/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 mb-6 text-sm text-subtle">Pick a handle, then sign up with Google, Facebook or email.</p>
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
