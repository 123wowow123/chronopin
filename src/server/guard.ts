import { redirect } from '@/lib/i18n/server';
import type User from './model/user';
import { viewerUser } from './viewer';

// The signed-in user for a page that needs one; otherwise off to the login
// page, which brings them back here afterwards.
export async function requireViewer(path: string): Promise<User> {
  const user = await viewerUser();
  if (!user) {
    return redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }
  return user;
}

export async function requireAdminViewer(path: string): Promise<User> {
  const user = await requireViewer(path);
  if (user.role !== 'admin') {
    return redirect('/');
  }
  return user;
}
