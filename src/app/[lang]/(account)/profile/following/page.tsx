import { redirect } from 'next/navigation';

// Who you follow moved in with the notification settings.
export default function FollowingPage() {
  redirect('/profile/notifications');
}
