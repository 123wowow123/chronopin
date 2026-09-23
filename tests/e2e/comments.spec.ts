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

// Up and down votes on comments (0073): the author cannot vote on their own,
// a vote shows at once and is still there after a reload, and the same arrow
// again takes it back.
test('a comment takes one up or down vote from each other reader', async ({ page, playwright, baseURL }) => {
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
  const posted = await author.post(`/api/pins/${pinId}/comment`, { data: { text: `A comment to vote on ${stamp}` } });
  expect(posted.ok()).toBe(true);
  const { id } = await posted.json();

  // The author's own arrows are off.
  const own = await author.put(`/api/pins/${pinId}/comment/${id}/vote`, { data: { value: 1 } });
  expect(own.status()).toBe(403);

  // A reader, signed in on the page itself.
  await signUp(page.request, 'cvoter');
  await page.goto(pinPath);
  const comment = page.locator(`#comment-${id}`);
  const votes = comment.getByRole('group', { name: 'Votes' });
  await expect(votes).toContainText('0');

  await votes.getByRole('button', { name: 'Upvote' }).click();
  await expect(votes).toContainText('1');
  await page.reload();
  await expect(votes).toContainText('1');
  await expect(votes.getByRole('button', { name: 'Remove your upvote' })).toHaveAttribute('aria-pressed', 'true');

  // Down replaces up; the same arrow again takes it back.
  await votes.getByRole('button', { name: 'Downvote' }).click();
  await expect(votes).toContainText('-1');
  await votes.getByRole('button', { name: 'Remove your downvote' }).click();
  await expect(votes).toContainText('0');
  await author.dispose();
});
