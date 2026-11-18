import { expect, test } from '@playwright/test';

async function hunterScreenX(
  page: import('@playwright/test').Page,
  canvas: import('@playwright/test').Locator
): Promise<number> {
  const screenshot = await canvas.screenshot();
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();

    const decoded = document.createElement('canvas');
    decoded.width = image.naturalWidth;
    decoded.height = image.naturalHeight;
    const context = decoded.getContext('2d');
    if (!context) throw new Error('Could not decode the Phaser canvas screenshot.');

    context.drawImage(image, 0, 0);
    const frame = context.getImageData(0, 0, decoded.width, decoded.height).data;
    let count = 0;
    let totalX = 0;

    // The camera follows the hunter, so its screen position is not fixed to one crop.
    // Match the generated hunter texture across the full canvas instead.
    for (let y = 0; y < decoded.height; y += 1) {
      for (let x = 0; x < decoded.width; x += 1) {
        const index = (y * decoded.width + x) * 4;
        const red = frame[index]!;
        const green = frame[index + 1]!;
        const blue = frame[index + 2]!;
        const alpha = frame[index + 3]!;
        if (
          red >= 174 && red <= 214 &&
          green >= 143 && green <= 183 &&
          blue >= 89 && blue <= 129 &&
          alpha >= 240
        ) {
          count += 1;
          totalX += x;
        }
      }
    }

    if (count < 80) {
      throw new Error(`Could not locate the hunter sprite in the rendered frame (matched ${count} pixels).`);
    }
    return totalX / count;
  }, screenshot.toString('base64'));
}

test('player can select a hunter and an unlocked region before starting a run', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();

  // A first launch creates a versioned local profile before the Phaser scenes start.
  const firstSave = await page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    return raw ? JSON.parse(raw) as { schemaVersion: number; profile: { createdAt: string }; progression: { unlockedCharacterIds: string[]; unlockedRegionIds: string[] } } : null;
  });
  expect(firstSave?.schemaVersion).toBe(1);
  expect(firstSave?.progression.unlockedCharacterIds).toContain('cursed-hunter');
  expect(firstSave?.progression.unlockedRegionIds).toContain('cursed-forest');

  // Reloading the page must retain the same profile rather than creating a new one.
  await page.reload();
  await expect(canvas).toBeVisible();
  const reloadedSave = await page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    return raw ? JSON.parse(raw) as { schemaVersion: number; profile: { createdAt: string } } : null;
  });
  expect(reloadedSave?.schemaVersion).toBe(1);
  expect(reloadedSave?.profile.createdAt).toBe(firstSave?.profile.createdAt);
  const dimensions = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height
  }));
  expect(dimensions).toEqual({ width: 1280, height: 720 });

  const menuFrame = await canvas.screenshot();
  await page.mouse.click(160, 555);
  // Keep the pointer off interactive controls so screenshot comparisons are deterministic.
  await page.mouse.move(1240, 40);
  await expect.poll(async () => !(await canvas.screenshot()).equals(menuFrame), {
    message: 'new run should open hunter selection'
  }).toBe(true);

  // Keyboard arrows are also the fallback for TV remotes that emit arrow keys.
  await page.keyboard.press('ArrowRight');
  const selectedHunterFrame = await canvas.screenshot();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  const regionFrame = await canvas.screenshot();
  expect(regionFrame.equals(menuFrame)).toBe(false);

  // The fifth region is visible as a locked preview and must not start a run.
  await page.mouse.click(1106, 320);
  await page.waitForTimeout(80);
  const lockedRegionFrame = await canvas.screenshot();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(180);
  expect((await canvas.screenshot()).equals(lockedRegionFrame)).toBe(true);

  // Going back must retain the hunter selected on the previous screen.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  expect((await canvas.screenshot()).equals(selectedHunterFrame)).toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);

  // Reopening the region screen and returning again must not retain stale selection graphics.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  expect((await canvas.screenshot()).equals(selectedHunterFrame)).toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);

  // The region screen reopens on the first unlocked region; start it.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const runFrame = await canvas.screenshot();
  expect(runFrame.equals(lockedRegionFrame)).toBe(false);

  // Verify real movement by tracking the starting hunter's rendered sprite pixels.
  // Let the camera finish its initial follow-in before recording the baseline.
  await page.waitForTimeout(900);
  const initialHunterX = await hunterScreenX(page, canvas);
  await page.keyboard.down('ArrowRight');
  let movedHunterX: number;
  try {
    await page.waitForTimeout(400);
    movedHunterX = await hunterScreenX(page, canvas);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  expect(movedHunterX!).toBeGreaterThan(initialHunterX + 4);

  // ESC opens pause and freezes the rendered world.
  const activeFrame = await canvas.screenshot();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const pausedFrame = await canvas.screenshot();
  expect(pausedFrame.equals(activeFrame)).toBe(false);

  await page.waitForTimeout(350);
  const stablePausedFrame = await canvas.screenshot();
  expect(stablePausedFrame.equals(pausedFrame)).toBe(true);

  const clockClip = { x: 580, y: 8, width: 120, height: 48 };
  const resumedClockStart = await page.screenshot({ clip: clockClip });
  await page.mouse.click(640, 374);
  await page.waitForTimeout(1_200);
  const resumedClockLater = await page.screenshot({ clip: clockClip });
  expect(resumedClockLater.equals(resumedClockStart)).toBe(false);

  expect(pageErrors).toEqual([]);
});
