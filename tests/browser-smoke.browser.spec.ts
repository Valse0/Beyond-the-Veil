import { expect, test } from '@playwright/test';

test('Phaser boots, renders the main menu, and enters a new run without page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();

  const dimensions = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  expect(dimensions).toEqual({ width: 1280, height: 720 });

  // Capture the stable menu frame, then activate the known "YENİ KOŞU" hit area.
  const menuFrame = await canvas.screenshot();
  await page.mouse.click(160, 555);

  // The run scene replaces the menu rendering. Compare canvas pixels rather than
  // depending on Phaser's private scene internals or adding production debug hooks.
  await expect.poll(async () => {
    const runFrame = await canvas.screenshot();
    return !runFrame.equals(menuFrame);
  }, { message: 'canvas should change from the main menu to the run scene', timeout: 10_000 }).toBe(true);

  expect(pageErrors).toEqual([]);
});
