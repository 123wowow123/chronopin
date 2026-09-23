import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = Date.now().toString(36);
const password = 'correct horse battery';

// A throwaway account, signed in on `api` (the run's teardown clears it).
async function signUp(api: APIRequestContext, who: string) {
  const email = `e2e-${who}-${stamp}@example.com`;
  const res = await api.post('/api/users', { data: { userName: `@e2e${who}${stamp}`, firstName: 'Vote', lastName: who, email, password } });
  expect(res.ok()).toBe(true);
  return email;
}

// Reactions to comments (0075), as in Messenger: the smiley beside the bubble
// opens the bar of six, a pick takes the place of the reader's last one and
// picking it again takes it back, the badge counts them all, and a reload
// keeps them.
test('a comment takes one reaction from each reader', async ({ page, playwright, baseURL }) => {
  // The author: an account that has confirmed its email, since posting a
  // comment waits for that (the link comes from a local script, as in
  // account.spec.ts).
  const author = await playwright.request.newContext({ baseURL });
  const authorEmail = await signUp(author, 'cauthor');
  const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', authorEmail], { cwd: root });
  await author.get(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  const pinPath = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    const pins = Array.isArray(body) ? body : body.pins;
    return `/pin/${pins[0].id}`;
  });
  const pinId = Number(pinPath.split('/').pop());
  const posted = await author.post(`/api/pins/${pinId}/comment`, { data: { text: `A comment to react to ${stamp}` } });
  expect(posted.ok()).toBe(true);
  const { id } = await posted.json();

  // The author may react to their own, and only the six are taken.
  const own = await author.put(`/api/pins/${pinId}/comment/${id}/reaction`, { data: { reaction: 'love' } });
  expect(await own.json()).toMatchObject({ reactions: { love: 1 }, myReaction: 'love' });
  expect((await author.put(`/api/pins/${pinId}/comment/${id}/reaction`, { data: { reaction: 'meh' } })).status()).toBe(400);

  // A reader, signed in on the page itself.
  await signUp(page.request, 'creactor');
  await page.goto(pinPath);
  const comment = page.locator(`#comment-${id}`);
  const total = comment.locator('[data-count="total"]');
  await expect(total).toHaveText('1');
  const picker = comment.getByRole('group', { name: 'Choose a reaction' });
  const pick = async (name: string) => {
    await comment.hover();
    await comment.getByRole('button', { name: 'Choose a reaction' }).click();
    await picker.getByRole('button', { name, exact: true }).click();
    await expect(picker).toHaveCount(0);
  };

  await pick('Like');
  await expect(total).toHaveText('2');
  await page.reload();
  await expect(total).toHaveText('2');
  await comment.hover();
  await comment.getByRole('button', { name: 'Choose a reaction' }).click();
  await expect(picker.getByRole('button', { name: 'Like', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);

  // Haha takes the like's place.
  await pick('Haha');
  await expect(total).toHaveText('2');
  const reactions = await author.get(`/api/pins/${pinId}/comment`).then((r) => r.json());
  expect(reactions.find((c: { id: number }) => c.id === id)).toMatchObject({ reactions: { love: 1, haha: 1 } });

  // Picking it again takes it back.
  await pick('Haha');
  await expect(total).toHaveText('1');
  await author.dispose();
});

// Reporting a comment (0074), from its three-dot menu: the reader picks why,
// and the author has no Report on their own.
test('a reader reports a comment from its menu', async ({ page, playwright, baseURL }) => {
  const author = await playwright.request.newContext({ baseURL });
  const authorEmail = await signUp(author, 'rauthor');
  const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', authorEmail], { cwd: root });
  await author.get(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  const pins = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    return Array.isArray(body) ? body : body.pins;
  });
  const pinId = pins[0].id;
  const posted = await author.post(`/api/pins/${pinId}/comment`, { data: { text: `A comment to report ${stamp}` } });
  const { id } = await posted.json();
  expect((await author.post(`/api/pins/${pinId}/comment/${id}/report`, { data: { reason: 'spam' } })).status()).toBe(403);

  await signUp(page.request, 'rreader');
  await page.goto(`/pin/${pinId}`);
  const comment = page.locator(`#comment-${id}`);
  await comment.getByRole('button', { name: 'More actions' }).click();
  // Not theirs, so no Delete.
  await expect(comment.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
  await comment.getByRole('menuitem', { name: 'Report' }).click();
  await comment.getByRole('menuitem', { name: 'Spam' }).click();
  await expect(comment.getByRole('status')).toBeVisible();
  expect((await page.request.post(`/api/pins/${pinId}/comment/${id}/report`, { data: { reason: 'nonsense' } })).status()).toBe(400);
  await author.dispose();
});
