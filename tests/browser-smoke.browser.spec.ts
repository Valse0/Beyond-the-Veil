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
    // The starting hunter uses the stable #c2a36d fill. Sample only the central
    // gameplay area so HUD text and the touch controls cannot affect the centroid.
    const sample = context.getImageData(560, 280, 160, 160).data;
    let count = 0;
    let totalX = 0;

    for (let y = 0; y < 160; y += 1) {
      for (let x = 0; x < 160; x += 1) {
        const index = (y * 160 + x) * 4;
        const red = sample[index]!;
        const green = sample[index + 1]!;
        const blue = sample[index + 2]!;
        const alpha = sample[index + 3]!;
        if (
          red >= 184 && red <= 204 &&
          green >= 153 && green <= 173 &&
          blue >= 99 && blue <= 119 &&
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
    return 560 + totalX / count;
  }, screenshot.toString('base64'));
}

test('Phaser boots, supports movement, pause/resume, and updates the HUD without page errors', async ({ page }) => {
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

  // Capture the stable menu frame, then activate the existing "YENİ KOŞU" hit area.
  const menuFrame = await canvas.screenshot();
  await page.mouse.click(160, 555);
  // Move away so a hover-color change cannot satisfy the scene-transition assertion.
  await page.mouse.move(1200, 680);

  await expect.poll(async () => {
    const runFrame = await canvas.screenshot();
    return !runFrame.equals(menuFrame);
  }, { message: 'canvas should change from the main menu to the run scene', timeout: 10_000 }).toBe(true);

  // Verify real movement by tracking the starting hunter's rendered sprite pixels.
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

  // ESC must open the pause overlay and freeze the rendered world.
  const activeFrame = await canvas.screenshot();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const pausedFrame = await canvas.screenshot();
  expect(pausedFrame.equals(activeFrame)).toBe(false);

  await page.waitForTimeout(350);
  const stablePausedFrame = await canvas.screenshot();
  expect(stablePausedFrame.equals(pausedFrame)).toBe(true);

  // Resume through the actual in-game control, then verify the HUD clock advances.
  const clockClip = { x: 580, y: 8, width: 120, height: 48 };
  const resumedClockStart = await page.screenshot({ clip: clockClip });
  await page.mouse.click(640, 374);
  await page.waitForTimeout(1_200);
  const resumedClockLater = await page.screenshot({ clip: clockClip });
  expect(resumedClockLater.equals(resumedClockStart)).toBe(false);

  expect(pageErrors).toEqual([]);
});
