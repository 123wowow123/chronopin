import type { Metadata } from 'next';
import { FollowButton } from '@/components/pin/FollowButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { requireViewer } from '@/server/guard';
import Follow from '@/server/model/follow';

export const metadata: Metadata = { title: 'Following' };

export default async function FollowingPage() {
  const user = await requireViewer('/following');
  const { following } = await Follow.listFollowing(user.id);
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-3xl">Following</h1>
      {following.length ? (
        <ul className="divide-y divide-raised">
          {following.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <UserAvatar userName={u.userName} className="size-9 text-base" />
              <a href={`/search?q=user:${encodeURIComponent(u.userName.replace(/^@/, ''))}`} className="flex-1 font-semibold text-ink">
                {u.userName}
              </a>
              <FollowButton userId={u.id} userName={u.userName} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">You&apos;re not following anyone yet.</p>
      )}
    </div>
  );
}
