import { test } from '@playwright/test';
import { expectReloadMatchesTodayButton } from './todayPosition';

// The timeline opens scrolled to today, and the Today button scrolls back
// there; both should land in the same place. They have drifted apart before:
// the opening scroll ran once, and the cards above today then grew as their
// browser-only details rendered, pushing today down by however much they grew.
test('opening or reloading the timeline puts today where the Today button does', async ({ page }) => {
  await expectReloadMatchesTodayButton(page);
});
