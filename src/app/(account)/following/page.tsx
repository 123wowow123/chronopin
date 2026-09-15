import type { Metadata } from 'next';
import { FollowButton } from '@/components/pin/FollowButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { requireViewer } from '@/server/guard';
import Follow from '@/server/model/follow';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Following' };

export default async function FollowingPage() {
  const user = await requireViewer('/following');
  const { following } = await Follow.listFollowing(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Following</h1>
      {following.length ? (
        <ul className="surface divide-y divide-line">
          {following.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar userName={u.userName} className="size-9 text-base" />
              <a href={`/search?q=user:${encodeURIComponent(u.userName.replace(/^@/, ''))}`} className="flex-1 font-semibold text-ink hover:text-link hover:no-underline">
                {u.userName}
              </a>
              <FollowButton userId={u.id} userName={u.userName} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="surface px-4 py-10 text-center text-subtle">You&apos;re not following anyone yet.</p>
      )}
    </div>
  );
}
