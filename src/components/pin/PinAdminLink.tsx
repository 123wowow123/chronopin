'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/lib/client/session';

export function PinAdminLink({ pinId }: { pinId: number }) {
  const { isAdmin } = useSession();
  return isAdmin ? (
    <Link href={`/update/${pinId}`} className="p-1 text-subtle hover:text-ink" title="Edit pin">
      <Icon name="pencil" className="size-4" />
    </Link>
  ) : null;
}
