import type { Metadata } from 'next';

// Sign-in, account and editing pages: useful to people, not to search engines.
// Every page here depends on who is signed in, and redirects to the login
// page when nobody is, so they render per request rather than from a shell.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl">{children}</main>;
}
