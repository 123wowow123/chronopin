import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-4xl font-bold text-muted">Login</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
