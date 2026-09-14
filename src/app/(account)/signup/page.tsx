import type { Metadata } from 'next';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-4xl font-bold text-muted">Sign up</h1>
      <SignupForm />
    </div>
  );
}
