'use client';

import Link from 'next/link';
import { useSession } from '@/lib/client/session';

// For the pin's author and admins, who are the ones allowed to edit it.
export function EditReferencesLink({ pinId, authorId, hasReferences }: { pinId: number; authorId?: number; hasReferences: boolean }) {
  const { user, isAdmin } = useSession();
  if (!user || !(isAdmin || (authorId != null && Number(user.id) === Number(authorId)))) {
    return null;
  }
  return (
    <Link href={`/update/${pinId}`} className="ml-auto text-sm font-normal">
      {hasReferences ? 'Edit references' : 'Add references'}
    </Link>
  );
}
