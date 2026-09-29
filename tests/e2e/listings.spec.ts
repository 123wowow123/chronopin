import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = Date.now().toString(36);
const password = 'correct horse battery';
const run = promisify(execFile);

// A throwaway account with a confirmed email, signed in on `api`.
async function member(api: APIRequestContext, who: string) {
  const email = `e2e-${who}-${stamp}@example.com`;
  const userName = `@e2e${who}${stamp}`;
  const res = await api.post('/api/users', { data: { userName, firstName: 'Market', lastName: who, email, password } });
  expect(res.ok()).toBe(true);
  const { stdout } = await run('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', email], { cwd: root });
  await api.get(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  const me = await (await api.get('/api/users/me')).json();
  return { id: me.id as number, userName };
}

// Marketplace listings (0095): "Sell this item here" on a product pin opens
// the item form with its preview; the listing shows on the pin; a buyer's
// question opens a chat whose bar offers a rating after seven turns; the
// seller's Listings page marks it sold and shows the rating they were given.
test('a reader lists a pin’s product, chats with a buyer and rates them after seven turns', async ({ page, playwright, baseURL }) => {
  test.setTimeout(120_000);
  const pinId = Number(/^\s*(\d+)\s*$/m.exec((await run('npx', ['tsx', 'scripts/data/e2eProductPin.ts'], { cwd: root })).stdout)?.[1]);
  expect(pinId).toBeGreaterThan(0);
  const buyerApi = await playwright.request.newContext({ baseURL });
  const buyer = await member(buyerApi, 'buyer');
  const seller = await member(page.request, 'seller');

  // The place search goes to the geocoder; answer it here.
  await page.route('**/api/place/search**', (route) => route.fulfill({ json: [{ latitude: 32.72, longitude: -117.16, name: 'San Diego, California' }] }));

  await page.goto(`/pin/${pinId}`);
  await page.getByRole('button', { name: 'Sell this item here' }).click();
  const form = page.getByRole('dialog', { name: 'Item for sale' });
  await expect(form.getByRole('heading', { name: 'Item for sale' })).toBeVisible();

  const title = `Barely worn ${stamp}`;
  await form.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  // The preview follows what is typed.
  await expect(form.getByText(title).last()).toBeVisible();

  // Publishing with no photo points at the photos.
  await form.getByRole('button', { name: 'Publish' }).click();
  await expect(form.getByRole('alert').first()).toBeVisible();

  const photo = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#c33' } }).jpeg().toBuffer();
  await form.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'jacket.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(form.getByRole('img', { name: 'Photo 1' })).toBeVisible();
  await form.getByRole('spinbutton', { name: 'Price' }).fill('240');
  await form.getByRole('combobox', { name: 'Category' }).selectOption('mensClothing');
  await form.getByRole('combobox', { name: 'Condition' }).selectOption('likeNew');
  await form.getByRole('searchbox', { name: 'Location' }).fill('San Diego');
  await form.getByRole('button', { name: 'San Diego, California' }).click();
  await form.getByRole('button', { name: 'Publish' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Your listing is live.' })).toBeVisible();
  const card = page.getByRole('button', { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await card.click();
  const view = page.getByRole('dialog', { name: title });
  await expect(view.getByText('This is your listing.')).toBeVisible();
  await view.getByRole('button', { name: 'Close' }).click();

  // The buyer asks about it, which ties their chat to the listing.
  const { listings } = await (await buyerApi.get(`/api/pins/${pinId}/listings`)).json();
  const listing = listings.find((l: { title: string }) => l.title === title);
  expect(listing.seller.id).toBe(seller.id);
  expect((await buyerApi.post(`/api/messages/${seller.id}`, { data: { body: 'Hi, is this still available?', listingId: listing.id } })).status()).toBe(201);

  await page.goto(`/messages?with=${buyer.id}`);
  await expect(page.getByText('Rate after 1/7 turns')).toBeVisible();
  // Rating opens only after seven turns: three more each way.
  for (let i = 0; i < 3; i++) {
    await page.request.post(`/api/messages/${buyer.id}`, { data: { body: `Yes, still here ${i}` } });
    await buyerApi.post(`/api/messages/${seller.id}`, { data: { body: `Great ${i}` } });
  }
  await expect(page.getByRole('button', { name: 'Rate buyer' })).toBeVisible();
  await page.getByRole('button', { name: 'Rate buyer' }).click();
  const rate = page.getByRole('dialog', { name: 'Rate buyer' });
  await expect(rate.getByText(`How was your experience selling to ${buyer.userName}?`)).toBeVisible();
  await rate.getByRole('radio', { name: 'Excellent' }).click();
  await expect(rate.getByText('What went well?')).toBeVisible();
  await rate.getByRole('button', { name: 'Polite' }).click();
  await rate.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByTitle('Change your rating')).toBeVisible();

  // The buyer rates the seller back; the seller's page shows it, and marks the listing sold.
  expect((await buyerApi.post(`/api/listings/${listing.id}/ratings`, { data: { userId: seller.id, stars: 4, tags: ['communication'], body: `Quick replies ${stamp}` } })).status()).toBe(201);
  await page.goto('/listings');
  const row = page.getByRole('region', { name: 'Your listings' }).getByRole('listitem').filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole('combobox', { name: 'Status' }).selectOption('sold');
  await expect(row.getByText('Sold', { exact: true })).toBeVisible();
  await expect(page.getByText(`Quick replies ${stamp}`)).toBeVisible();

  // Sold, it leaves the pin.
  expect((await (await buyerApi.get(`/api/pins/${pinId}/listings`)).json()).listings.some((l: { id: number }) => l.id === listing.id)).toBe(false);
  await buyerApi.dispose();
});

// A visitor who clicks "Sell this item here" logs in first, and comes back to
// the pin with the form already open - once: a reload leaves it shut.
test('a visitor who clicks Sell this item here logs in and lands back on the open form', async ({ page, playwright, baseURL }) => {
  const pinId = Number(/^\s*(\d+)\s*$/m.exec((await run('npx', ['tsx', 'scripts/data/e2eProductPin.ts'], { cwd: root })).stdout)?.[1]);
  const api = await playwright.request.newContext({ baseURL });
  const email = `e2e-visitor-${stamp}@example.com`;
  expect((await api.post('/api/users', { data: { userName: `@e2evisitor${stamp}`, firstName: 'Market', lastName: 'visitor', email, password } })).ok()).toBe(true);
  await api.dispose();

  await page.goto(`/pin/${pinId}`);
  await page.getByRole('button', { name: 'Sell this item here' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('dialog', { name: 'Item for sale' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/pin/${pinId}/[^?]*$`));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sell this item here' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Item for sale' })).toHaveCount(0);
});
