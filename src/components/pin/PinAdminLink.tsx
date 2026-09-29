'use client';

import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';

export function PinAdminLink({ pinId }: { pinId: number }) {
  const { isAdmin } = useSession();
  const t = useT();
  return isAdmin ? (
    <Link href={`/update/${pinId}`} className="inline-flex rounded-md p-1.5 text-subtle hover:bg-raised hover:text-ink" title={t('pin.editPin')}>
      <Icon name="pencil" className="size-4" />
    </Link>
  ) : null;
}
