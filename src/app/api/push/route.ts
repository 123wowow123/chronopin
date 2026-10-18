import { connection } from 'next/server';
import { json, route } from '@/server/http';
import { pushPublicKey } from '@/server/push';

// The public VAPID key a browser subscribes to Web Push with, or null when
// this server sends none (alerts then reach open pages only). Read per
// request: prerendered, it would be the build's environment, which has no keys.
export const GET = route(async () => {
  await connection();
  return json({ publicKey: pushPublicKey() });
});
