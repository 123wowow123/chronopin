import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import config from '@/server/config';
import { HttpError, json, noContent, route } from '@/server/http';

// eBay's Marketplace Account Deletion endpoint (developer.ebay.com keyset ->
// Alerts & Notifications). eBay verifies it with a GET ?challenge_code=, which
// is answered with the SHA-256 hex of challengeCode + verificationToken +
// the endpoint's exact URL; later POSTs tell us a user asked eBay to delete
// their data. We store no eBay user data (only listing prices), so those are
// just acknowledged.
const ENDPOINT = 'https://www.chronopin.com/api/ebay/account-deletion';

export const GET = route(async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get('challenge_code');
  const token = config.ebay.verificationToken;
  if (!code || !token) throw new HttpError(400, 'Missing challenge_code.');
  const challengeResponse = createHash('sha256').update(code).update(token).update(ENDPOINT).digest('hex');
  return json({ challengeResponse });
});

export const POST = route(async () => noContent(200));
