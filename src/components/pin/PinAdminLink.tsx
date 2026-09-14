'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/lib/client/session';

export function PinAdminLink({ pinId }: { pinId: number }) {
  const { isAdmin } = useSession();
  return isAdmin ? (
    <Link href={`/update/${pinId}`} className="rounded-md p-1.5 text-subtle hover:bg-raised hover:text-ink" title="Edit pin">
      <Icon name="pencil" className="size-4" />
    </Link>
  ) : null;
}
