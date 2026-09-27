import { json, route } from '@/server/http';
import { pushPublicKey } from '@/server/push';

// The public VAPID key a browser subscribes to Web Push with, or null when
// this server sends none (alerts then reach open pages only).
export const GET = route(async () => json({ publicKey: pushPublicKey() }));
