import { expect, test } from '@playwright/test';
import { expectReloadMatchesTodayButton } from './todayPosition';

// The timeline opens scrolled to today, and the Today button scrolls back
// there; both should land in the same place. They have drifted apart before:
// the opening scroll ran once, and the cards above today then grew as their
// browser-only details rendered, pushing today down by however much they grew.
test('opening or reloading the timeline puts today where the Today button does', async ({ page }) => {
  await expectReloadMatchesTodayButton(page);
});

// Search results that never reach today - a date: search keeps to days of
// its own, a finished tour ended before now - have no TODAY marker among
// them, and used to have no Today button either: having scrolled away, there
// was no way back to now. The button belongs on every search timeline, and
// goes to the day nearest today where today itself is not among the results.
test('a search that never reaches today still has a Today button', async ({ page }) => {
  // A day with pins on it, as the app itself keys days: the first day a
  // search by date has loaded, which is pages behind today.
  await page.goto('/search?q=category:Transport&sort=date&posted=all', { waitUntil: 'networkidle' });
  const day = await page.locator('section[id^="day-"]').first().evaluate((el) => el.id.slice(4));

  await page.goto(`/search?q=${encodeURIComponent(`date:${day}`)}&posted=all`, { waitUntil: 'networkidle' });
  await expect(page.locator(`#day-${day}`)).toBeVisible();
  // Today is not one of the days searched, so nothing marks it.
  await expect(page.locator('#today-marker')).toHaveCount(0);

  await page.locator('button:visible', { hasText: /^Today$/ }).first().click();
  // That day, as near the top of the window as a page this short can bring it.
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const top = document.getElementById(id)!.getBoundingClientRect().top;
        const atFoot = document.documentElement.scrollHeight - window.innerHeight - window.scrollY <= 1;
        return top <= 120 || atFoot;
      }, `day-${day}`),
    )
    .toBe(true);
});
