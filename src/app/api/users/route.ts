import _ from 'lodash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { birthdayMessage, birthdayProblem } from '@/lib/birthday';
import { normalizePhone, phoneMessage, phoneProblem } from '@/lib/phone';
import { requireRole, signToken, tokenCookie } from '@/server/auth';
import { sendVerificationEmailInBackground } from '@/server/emailVerification';
import { json, readJson, route } from '@/server/http';
import User, { pickUserProps, takenBody, takenField, Users } from '@/server/model/user';

// Every user (admin only).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await Users.getAll(pickUserProps));
});

// Sign up with email and password. Signs the new user in.
export const POST = route(async (request: NextRequest) => {
  // Only what the sign-up form asks for. The Express route took the whole
  // body, so a request could also set an id, social ids or a salt.
  const body = _.pick(await readJson(request), ['userName', 'firstName', 'lastName', 'birthday', 'phone', 'email', 'password']);

  // Optional, so only a birthday that was given has to make sense. The column
  // would refuse a stray string anyway, with a raw database error.
  const badBirthday = birthdayProblem(body.birthday);
  if (badBirthday) return json({ code: `birthday.${badBirthday}`, message: birthdayMessage(badBirthday) }, 422);
  const badPhone = phoneProblem(body.phone);
  if (badPhone) return json({ code: `phone.${badPhone}`, message: phoneMessage() }, 422);
  body.phone = normalizePhone(body.phone);

  const user = new User(body);
  user.provider = 'local';
  user.role = 'user';

  try {
    await user.save();
  } catch (err) {
    const taken = takenField(err);
    if (taken) return json(takenBody(taken), 409);
    return json(err instanceof Error ? { message: err.message } : err, 422);
  }

  // Signed in straight away; posting waits for the link in this email.
  sendVerificationEmailInBackground(user, request);

  const token = await signToken(user.id, user.role);
  (await cookies()).set(tokenCookie(token));
  return json({ token });
});
