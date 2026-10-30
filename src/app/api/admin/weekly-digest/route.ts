import type { NextRequest } from 'next/server';
import { parseWeeklyDigest } from '@/lib/weeklyDigest';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getWeeklyDigest, setWeeklyDigest } from '@/server/model/appSetting';
import User from '@/server/model/user';
import { sendTestDigest } from '@/server/services/weeklyDigest';

// The switch for the weekly "my timeline" email (/admin/digest).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getWeeklyDigest());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseWeeklyDigest(await readJson(request));
  if ('problem' in parsed) throw new HttpError(400, '', { message: parsed.problem });
  await setWeeklyDigest(parsed.setting, admin.id);
  return json(parsed.setting);
});

// Send the signed-in admin their own digest now, to see it. Not counted.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { user } = await User.getById(admin.id);
  if (!user?.email) throw new HttpError(400, '', { message: 'Your account has no email address' });
  const { pins } = await sendTestDigest({ id: user.id, email: user.email, firstName: user.firstName ?? null, userName: user.userName ?? null });
  return json({ pins, message: pins ? `Sent ${pins} pins to ${user.email}.` : 'Nothing is coming up from what you watch or follow in the next 7 days, so nothing was sent.' });
});
