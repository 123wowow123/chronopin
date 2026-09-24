import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = Date.now().toString(36);
const password = 'correct horse battery';

// A throwaway account with a confirmed email, signed in on `api` (the run's
// teardown clears it). Resolves its id and handle.
async function member(api: APIRequestContext, who: string) {
  const email = `e2e-${who}-${stamp}@example.com`;
  const userName = `@e2e${who}${stamp}`;
  const res = await api.post('/api/users', { data: { userName, firstName: 'Block', lastName: who, email, password } });
  expect(res.ok()).toBe(true);
  const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', email], { cwd: root });
  await api.get(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  const me = await (await api.get('/api/users/me')).json();
  return { id: me.id as number, userName };
}

// Blocking another reader (0076), from a comment's menu: their comments go
// at once and stay gone, they no longer see yours or can answer or react to
// them, their pins leave your search, and Profile > Blocked undoes it.
test('a reader blocks another from a comment, and unblocks them', async ({ page, playwright, baseURL }) => {
  const other = await playwright.request.newContext({ baseURL });
  const them = await member(other, 'blocked');
  const pins = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    return Array.isArray(body) ? body : body.pins;
  });
  const pinId = pins[0].id;
  const theirText = `A comment by someone about to be blocked ${stamp}`;
  const theirs = (await (await other.post(`/api/pins/${pinId}/comment`, { data: { text: theirText } })).json()).id;

  await member(page.request, 'blocker');
  const myText = `A comment by the blocker ${stamp}`;
  const mine = (await (await page.request.post(`/api/pins/${pinId}/comment`, { data: { text: myText } })).json()).id;

  // Before the block they answer mine, which rings my bell.
  const reply = await other.post(`/api/pins/${pinId}/comment`, { data: { text: `An answer ${stamp}`, parentCommentId: mine } });
  expect(reply.status()).toBe(201);
  const bell = async () => (await (await page.request.get('/api/notifications')).json()).notifications.filter((n: { type: string }) => n.type === 'reply');
  expect(await bell()).toHaveLength(1);

  await page.goto(`/pin/${pinId}`);
  const comment = page.locator(`#comment-${theirs}`);
  await expect(comment).toContainText(theirText);
  await comment.hover();
  await comment.getByRole('button', { name: 'More actions' }).click();
  await comment.getByRole('menuitem', { name: 'Block' }).click();
  await comment.getByRole('menuitem', { name: `Block ${them.userName}` }).click();
  await expect(page.locator(`#comment-${theirs}`)).toHaveCount(0);
  await page.reload();
  await expect(page.locator(`#comment-${mine}`)).toContainText(myText);
  await expect(page.locator(`#comment-${theirs}`)).toHaveCount(0);

  // Nothing of theirs is left in the bell either.
  expect(await bell()).toHaveLength(0);

  // It works both ways for comments: they no longer see mine, and cannot
  // answer or react to it.
  const seen = (await (await other.get(`/api/pins/${pinId}/comment`)).json()).map((c: { id: number }) => c.id);
  expect(seen).not.toContain(mine);
  expect((await other.put(`/api/pins/${pinId}/comment/${mine}/reaction`, { data: { reaction: 'angry' } })).status()).toBe(403);
  expect((await other.post(`/api/pins/${pinId}/comment`, { data: { text: 'A reply', parentCommentId: mine } })).status()).toBe(403);

  // Profile > Blocked lists them; Unblock brings their comment back.
  await page.goto('/profile/blocked');
  const row = page.getByRole('listitem').filter({ hasText: them.userName });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText("You haven't blocked anyone.")).toBeVisible();
  await page.goto(`/pin/${pinId}`);
  await expect(page.locator(`#comment-${theirs}`)).toContainText(theirText);
  await other.dispose();
});

// The user: search's card has its own three-dot menu to block from, and
// the blocked author's pins leave the search; Unblock there brings them back.
test("a reader blocks an author from their search card, and their pins leave", async ({ page }) => {
  const pins = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    return Array.isArray(body) ? body : body.pins;
  });
  const author = pins.find((p: { user?: { id: number; userName?: string } }) => p.user?.userName)!.user;
  await member(page.request, 'pinblocker');
  await page.goto(`/search?q=${encodeURIComponent(`user:${author.userName.replace(/^@/, '')}`)}`);
  const cards = page.getByRole('article');
  await expect(cards.first()).toBeVisible();

  // The author's card over the results (each pin card has a menu too).
  const menu = page.locator('div.floating').filter({ hasText: author.userName }).getByRole('button', { name: 'More actions' });
  await menu.click();
  await page.getByRole('menuitem', { name: new RegExp(`^Block ${author.userName}`) }).click();
  await page.getByRole('menuitem', { name: `Block ${author.userName}`, exact: true }).click();
  await expect(cards).toHaveCount(0);
  await expect(page.getByText('Blocked', { exact: true })).toBeVisible();
  // Nor can they be followed while blocked.
  expect((await page.request.post(`/api/users/${author.id}/follow`)).status()).toBe(403);

  await menu.click();
  await page.getByRole('menuitem', { name: /^Unblock/ }).click();
  await expect(cards.first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Follow/ })).toBeVisible();
});

// A pin card's menu blocks the pin's company (0078): every pin about it
// leaves the search, and Profile > Blocked lists it with Unblock.
test("a reader blocks a pin's company from its card, and unblocks it", async ({ page }) => {
  await member(page.request, 'coblocker');
  const pins = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    return Array.isArray(body) ? body : body.pins;
  });
  const pin = pins.find((p: { companyId?: number; company?: string; user?: { userName?: string } }) => p.companyId && p.company && p.user?.userName)!;
  const search = `/search?q=${encodeURIComponent(`user:${pin.user.userName.replace(/^@/, '')}`)}`;
  await page.goto(search);
  const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: pin.title, exact: true }) });
  await expect(card).toHaveCount(1);

  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: new RegExp(`^Block ${pin.company}`) }).click();
  await page.getByRole('menuitem', { name: `Block ${pin.company}`, exact: true }).click();
  await expect(card).toHaveCount(0);
  // Nor can it be followed while blocked.
  expect((await page.request.post(`/api/companies/${pin.companyId}/follow`)).status()).toBe(403);

  await page.goto('/profile/blocked');
  const row = page.getByRole('listitem').filter({ hasText: pin.company });
  await row.getByRole('button', { name: 'Unblock' }).click();
  await expect(row).toHaveCount(0);
  await page.goto(search);
  await expect(card).toHaveCount(1);
});
