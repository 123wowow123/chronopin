import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = Date.now().toString(36);
const password = 'correct horse battery';

// A throwaway account with a confirmed email, signed in on `api` (the run's
// teardown clears it, and its chats with it). Resolves its id and handle.
async function member(api: APIRequestContext, who: string) {
  const email = `e2e-${who}-${stamp}@example.com`;
  const userName = `@e2e${who}${stamp}`;
  const res = await api.post('/api/users', { data: { userName, firstName: 'Chat', lastName: who, email, password } });
  expect(res.ok()).toBe(true);
  const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', email], { cwd: root });
  await api.get(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  const me = await (await api.get('/api/users/me')).json();
  return { id: me.id as number, userName };
}

// Direct messages (0092): a message rings the navbar's Messenger badge, the
// chats panel opens it as a docked window, replies and new messages go both
// ways live, the other side's "Seen" shows, and a block closes the chat.
test('two readers message each other through the chats panel and a docked window', async ({ page, playwright, baseURL }) => {
  const other = await playwright.request.newContext({ baseURL });
  const friend = await member(other, 'friend');
  const me = await member(page.request, 'reader');

  const first = `Hello from a friend ${stamp}`;
  expect((await other.post(`/api/messages/${me.id}`, { data: { body: first } })).status()).toBe(201);

  await page.goto('/');
  const messenger = page.getByRole('button', { name: 'Chats, 1 unread' });
  await expect(messenger).toBeVisible();
  await messenger.click();
  const row = page.getByRole('button', { name: new RegExp(friend.userName) }).filter({ hasText: first });
  await expect(row).toBeVisible();
  await row.click();

  // The window reads the chat, which clears the badge.
  const chat = page.getByRole('region', { name: friend.userName });
  await expect(chat.getByText(first)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chats', exact: true })).toBeVisible();

  // A reply from the window reaches the other side.
  const reply = `A reply from the reader ${stamp}`;
  const box = chat.getByRole('textbox', { name: 'Message' });
  await box.fill(reply);
  await box.press('Enter');
  await expect(chat.getByText(reply)).toBeVisible();
  const theirs = await (await other.get(`/api/messages/${me.id}`)).json();
  expect(theirs.messages.map((m: { body: string }) => m.body)).toEqual([first, reply]);

  // Their next message arrives live, and their reading it shows as Seen.
  const second = `And another one ${stamp}`;
  await other.post(`/api/messages/${me.id}`, { data: { body: second } });
  await expect(chat.getByText(second)).toBeVisible();
  const reply2 = `Seen this? ${stamp}`;
  await box.fill(reply2);
  await box.press('Enter');
  await expect(chat.getByText(reply2)).toBeVisible();
  expect((await other.post(`/api/messages/${me.id}/read`)).status()).toBe(204);
  await expect(chat.getByTitle(`Seen by ${friend.userName}`)).toBeVisible();

  // The empty composer's smiley opens the comments' bar of six; a pick is sent.
  await chat.getByRole('button', { name: 'Send an emoji' }).click();
  await chat.getByRole('button', { name: 'Haha' }).click();
  await expect(chat.getByText('😆')).toBeVisible();
  await expect.poll(async () => (await (await other.get(`/api/messages/${me.id}`)).json()).messages.at(-1).body).toBe('😆');

  // The chat stays docked across a reload. The panel's expand button opens
  // /messages, where picking a chat keeps the page behind one step back.
  await page.reload();
  await expect(page.getByRole('region', { name: friend.userName }).getByText(reply2)).toBeVisible();
  await page.getByRole('button', { name: 'Chats', exact: true }).click();
  await page.getByRole('link', { name: 'See all in Messages' }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(friend.userName) }).filter({ hasText: '😆' }).click();
  await expect(page).toHaveURL(new RegExp(`/messages\\?with=${friend.id}$`));
  await expect(page.getByText(second)).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/localhost:\d+\/(#[\d-]+)?$/);

  // Each message's menu: Report (theirs), Unsend (mine, asked first), Forward.
  // The first row with the text: a reply quoting it comes after the original.
  const bubble = (text: string) => chat.locator('[class~="group/message"]', { hasText: text }).first();
  const menu = async (text: string, item: string) => {
    await bubble(text).hover();
    await bubble(text).getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: item, exact: true }).click();
  };
  await menu(second, 'Report');
  await page.getByRole('menuitem', { name: 'Spam' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'an admin will take a look' })).toBeVisible();
  await page.keyboard.press('Escape');
  // Reply: the arrow beside a message, a "Replying to" bar, and the answer
  // quoting what it answers.
  const answer = `An answer to that ${stamp}`;
  await bubble(second).hover();
  await bubble(second).getByRole('button', { name: 'Reply' }).click();
  await expect(chat.getByText(`Replying to ${friend.userName}`)).toBeVisible();
  await box.fill(answer);
  await box.press('Enter');
  await expect(chat.getByText(`You replied to ${friend.userName}`)).toBeVisible();
  await expect(bubble(answer).getByRole('button', { name: second })).toBeVisible();
  await expect.poll(async () => (await (await other.get(`/api/messages/${me.id}`)).json()).messages.at(-1).replyTo?.body).toBe(second);
  await menu(reply2, 'Unsend');
  await page.getByRole('menuitem', { name: 'Unsend', exact: true }).click();
  await expect(chat.getByText('You unsent a message')).toBeVisible();
  const after = (await (await other.get(`/api/messages/${me.id}`)).json()).messages;
  expect(after.find((m: { body: string; unsent: boolean }) => m.unsent)).toMatchObject({ body: '' });
  // Unsending a message changes its quote in a reply below at once.
  const quoted = `Quote me ${stamp}`;
  await box.fill(quoted);
  await box.press('Enter');
  await bubble(quoted).hover();
  await bubble(quoted).getByRole('button', { name: 'Reply' }).click();
  await box.fill(`Answering myself ${stamp}`);
  await box.press('Enter');
  await expect(chat.getByText('You replied to yourself')).toBeVisible();
  await menu(quoted, 'Unsend');
  await page.getByRole('menuitem', { name: 'Unsend', exact: true }).click();
  await expect(bubble(`Answering myself ${stamp}`).getByRole('button', { name: 'You unsent a message' })).toBeVisible();
  await expect(chat.getByText(quoted)).toHaveCount(0);

  await menu(first, 'Forward');
  const dialog = page.getByRole('dialog', { name: 'Forward' });
  await dialog.getByRole('button', { name: new RegExp(friend.userName) }).click();
  await expect(dialog.getByText(`Sent to ${friend.userName}`)).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(chat.getByText(first)).toHaveCount(2);

  // Closed, a new message waits as a bubble with a count, still unread,
  // until the bubble is opened.
  await chat.getByRole('button', { name: 'Close' }).click();
  await other.post(`/api/messages/${me.id}`, { data: { body: `While you were away ${stamp}` } });
  await expect(page.getByRole('button', { name: 'Chats, 1 unread' })).toBeVisible();
  const waiting = page.getByRole('button', { name: friend.userName, exact: true });
  await expect(waiting.locator('..')).toContainText('1');
  await waiting.click();
  await expect(chat.getByText(`While you were away ${stamp}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chats', exact: true })).toBeVisible();

  // A block, either way, hides the chat and refuses new messages.
  await other.put(`/api/users/${me.id}/block`);
  expect((await page.request.post(`/api/messages/${friend.id}`, { data: { body: 'Still there?' } })).status()).toBe(403);
  expect((await (await page.request.get('/api/messages')).json()).conversations).toHaveLength(0);
  await page.reload();
  await expect(page.getByText('You can’t message this person.')).toBeVisible();
  await other.dispose();
});

// Photos (0096): a picture pasted into the composer is uploaded at once and
// sent with or without text; the other side gets it, a forward carries it,
// someone else's upload is refused, and unsending wipes it.
test('a pasted picture is sent as a photo message', async ({ page, playwright, baseURL }) => {
  const other = await playwright.request.newContext({ baseURL });
  const friend = await member(other, 'photofriend');
  const me = await member(page.request, 'photoreader');
  await other.post(`/api/messages/${me.id}`, { data: { body: `Send me a picture ${stamp}` } });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chats, 1 unread' }).click();
  await page.getByRole('button', { name: new RegExp(friend.userName) }).first().click();
  const chat = page.getByRole('region', { name: friend.userName });
  const box = chat.getByRole('textbox', { name: 'Message' });
  await expect(chat.getByText(`Send me a picture ${stamp}`)).toBeVisible();

  // A screenshot on the clipboard, pasted: a picture only, no text.
  await box.evaluate(async (el) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d33';
    ctx.fillRect(0, 0, 320, 200);
    const blob = await new Promise<Blob>((done) => canvas.toBlob((b) => done(b!), 'image/png'));
    const data = new DataTransfer();
    data.items.add(new File([blob], 'image.png', { type: 'image/png' }));
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(chat.getByRole('button', { name: 'Remove photo' })).toBeVisible();
  const send = chat.getByRole('button', { name: 'Send' });
  await expect(send).toBeEnabled();
  await box.fill(`Here it is ${stamp}`);
  await box.press('Enter');

  const photo = chat.getByRole('button', { name: 'View photo' }).locator('img');
  await expect(photo).toHaveCount(1);
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(320);
  const sent = (await (await other.get(`/api/messages/${me.id}`)).json()).messages.at(-1);
  expect(sent).toMatchObject({ body: `Here it is ${stamp}`, images: [expect.stringMatching(new RegExp(`^message/${me.id}-`))] });
  const name = sent.images[0] as string;

  // Full size on a press; Escape shuts it.
  await chat.getByRole('button', { name: 'View photo' }).click();
  await expect(page.getByRole('dialog', { name: 'View photo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'View photo' })).toHaveCount(0);

  // The friend can forward the photo on (back to the reader, the one chat
  // they share); a photo they never saw is refused.
  expect((await other.post(`/api/messages/${me.id}`, { data: { body: '', images: [name] } })).status()).toBe(201);
  expect((await other.post(`/api/messages/${me.id}`, { data: { body: '', images: [`message/${me.id}-not-theirs.jpg`] } })).status()).toBe(422);
  await expect(chat.getByRole('button', { name: 'View photo' })).toHaveCount(2);
  expect((await (await page.request.get('/api/messages')).json()).conversations[0].lastMessage).toMatchObject({ body: '', images: [name] });

  // Unsending the original wipes it; the forward still holds the photo.
  const mine = chat.locator('[class~="group/message"]', { hasText: `Here it is ${stamp}` });
  await mine.hover();
  await mine.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Unsend', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Unsend', exact: true }).click();
  await expect(chat.getByText('You unsent a message')).toBeVisible();
  await expect(chat.getByRole('button', { name: 'View photo' })).toHaveCount(1);
  const unsent = (await (await other.get(`/api/messages/${me.id}`)).json()).messages.find((m: { unsent: boolean }) => m.unsent);
  expect(unsent).toMatchObject({ body: '', images: [] });
  await other.dispose();
});
