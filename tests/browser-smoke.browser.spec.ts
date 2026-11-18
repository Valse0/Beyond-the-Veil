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

  await page.goto('/?bv-test=1');
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

  // Let the camera's follow easing settle after movement before comparing paused frames.
  // Otherwise the camera can continue drifting briefly even though gameplay input has stopped.
  await page.waitForTimeout(900);

  // ESC opens pause and freezes the rendered world.
  const activeFrame = await canvas.screenshot();
  await page.keyboard.press('Escape');
  // Wait for the actual Phaser run state, not an arbitrary delay or visual overlay.
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).paused, {
    message: 'Escape should put the run into its paused state'
  }).toBe(true);
  const pausedFrame = await canvas.screenshot();
  expect(pausedFrame.equals(activeFrame)).toBe(false);

  const pausedSnapshot = await readBrowserRunSnapshot(page);
  await page.waitForTimeout(350);
  const stablePausedSnapshot = await readBrowserRunSnapshot(page);
  expect(stablePausedSnapshot.elapsedMs).toBe(pausedSnapshot.elapsedMs);
  expect(stablePausedSnapshot.playerX).toBeCloseTo(pausedSnapshot.playerX, 3);
  expect(stablePausedSnapshot.playerY).toBeCloseTo(pausedSnapshot.playerY, 3);

  const clockClip = { x: 580, y: 8, width: 120, height: 48 };
  const resumedClockStart = await page.screenshot({ clip: clockClip });
  await page.mouse.click(640, 374);
  await page.waitForTimeout(1_200);
  const resumedClockLater = await page.screenshot({ clip: clockClip });
  expect(resumedClockLater.equals(resumedClockStart)).toBe(false);

  expect(pageErrors).toEqual([]);
});


test('region selection reads unlocked regions from the persisted profile', async ({ page }) => {
  await page.goto('/');
  await page.locator('#game-container canvas').waitFor();

  // Simulate a previously earned region unlock, then verify the scene reads it after boot.
  await page.evaluate(() => {
    const key = 'beyond-the-veil.save';
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error('First-launch save was not created.');
    const save = JSON.parse(raw) as { progression: { unlockedRegionIds: string[] } };
    save.progression.unlockedRegionIds.push('forgotten-graveyard');
    window.localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();

  await page.mouse.click(160, 555);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  const regionScreen = await canvas.screenshot();

  // The second region is unlocked by the persisted profile and can launch a run.
  await page.mouse.click(407, 320);
  await page.mouse.click(1124, 644);
  await page.waitForTimeout(180);
  expect((await canvas.screenshot()).equals(regionScreen)).toBe(false);
});

type BrowserRunSnapshot = {
  level:number;experience:number;experienceToNext:number;queuedLevels:number;elapsedMs:number;playerX:number;playerY:number;
  paused:boolean;bossSpawned:boolean;bossChestAvailable:boolean;bossVictoryPending:boolean;evolvedWeaponIds:string[];choices:{id:string;title:string}[];
  runSoulEssence:number;kills:number;runFinished:boolean;lastRunSaved:boolean|null;bossHealth:number|null;
  bossChestDiagnostics:{overlapCount:number;lastOverlapAtMs:number|null;playerBody:{x:number;y:number;width:number;height:number;enabled:boolean};chestBody:{x:number;y:number;width:number;height:number;enabled:boolean}|null};
  controls:{rerollsRemaining:number;banishesRemaining:number;skipsRemaining:number;bannedChoiceIds:string[]};
  runEvents:{selected:string[];active:{kind:string;progress:number;stage:number;status:string}|null;completed:string[];failed:string[]};
};

async function startBrowserTestRun(page: import('@playwright/test').Page): Promise<import('@playwright/test').Locator> {
  await page.goto('/?bv-test=1');
  const canvas=page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {registry:{get:(key:string)=>unknown}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game&&game.registry.get('browserTestMode')===true);
  });
  await page.mouse.click(160,555);
  await page.mouse.move(1240,40);
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(180);
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run'));
  });
  return canvas;
}

async function readBrowserRunSnapshot(page: import('@playwright/test').Page): Promise<BrowserRunSnapshot> {
  return page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestSnapshot:()=>BrowserRunSnapshot}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestSnapshot();
  });
}

async function spawnBrowserTestXp(page: import('@playwright/test').Page,xp:number): Promise<void> {
  await page.evaluate(value => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestSpawnXpOrb:(amount:number)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestSpawnXpOrb(value);
  },xp);
}

async function defeatBrowserTestEnemy(page: import('@playwright/test').Page,enemyId:string): Promise<void> {
  await page.evaluate(id => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestSpawnAndDefeatEnemy:(value:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestSpawnAndDefeatEnemy(id);
  },enemyId);
}

async function prepareBrowserTestBossChestEvolution(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestPrepareBossChestEvolution:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestPrepareBossChestEvolution();
  });
}

async function defeatBrowserTestBoss(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestDefeatBoss:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestDefeatBoss();
  });
}

async function moveToBrowserTestBossChest(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestMoveToBossChest:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestMoveToBossChest();
  });
}

async function completeBrowserTestEvent(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestCompleteActiveEvent:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestCompleteActiveEvent();
  });
}

async function finishBrowserTestRun(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestFinishRun();
  });
}


test('real level-up overlay supports XP, two rerolls, banish and one skip', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const canvas=await startBrowserTestRun(page);

  // The test orb is placed on the hunter; Phaser's actual Arcade overlap collects it.
  await spawnBrowserTestXp(page,260);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).paused).toBe(true);
  const initial=await readBrowserRunSnapshot(page);
  expect(initial.level).toBeGreaterThan(1);
  expect(initial.queuedLevels).toBeGreaterThan(1);
  expect(initial.choices).toHaveLength(4);
  expect(initial.controls).toEqual({rerollsRemaining:2,banishesRemaining:1,skipsRemaining:1,bannedChoiceIds:[]});

  const firstIds=initial.choices.map(choice=>choice.id).sort();
  await canvas.click({position:{x:410,y:569}});
  const afterFirstReroll=await readBrowserRunSnapshot(page);
  expect(afterFirstReroll.controls.rerollsRemaining).toBe(1);
  expect(afterFirstReroll.choices.map(choice=>choice.id).some(id=>firstIds.includes(id))).toBe(false);

  const secondIds=afterFirstReroll.choices.map(choice=>choice.id).sort();
  await canvas.click({position:{x:410,y:569}});
  const afterSecondReroll=await readBrowserRunSnapshot(page);
  expect(afterSecondReroll.controls.rerollsRemaining).toBe(0);
  expect(afterSecondReroll.choices.map(choice=>choice.id).some(id=>secondIds.includes(id))).toBe(false);

  const exhaustedRerollChoices=afterSecondReroll.choices.map(choice=>choice.id).sort();
  await canvas.click({position:{x:410,y:569}});
  expect((await readBrowserRunSnapshot(page)).choices.map(choice=>choice.id).sort()).toEqual(exhaustedRerollChoices);

  const bannedId=afterSecondReroll.choices[0]!.id;
  await canvas.click({position:{x:640,y:569}});
  await canvas.click({position:{x:310,y:382}});
  const afterBanish=await readBrowserRunSnapshot(page);
  expect(afterBanish.controls.banishesRemaining).toBe(0);
  expect(afterBanish.controls.bannedChoiceIds).toContain(bannedId);
  expect(afterBanish.choices.map(choice=>choice.id)).not.toContain(bannedId);

  const queuedBeforeSkip=afterBanish.queuedLevels;
  await canvas.click({position:{x:870,y:569}});
  const afterSkip=await readBrowserRunSnapshot(page);
  expect(afterSkip.controls.skipsRemaining).toBe(0);
  expect(afterSkip.queuedLevels).toBe(queuedBeforeSkip-1);
  expect(afterSkip.choices.map(choice=>choice.id)).not.toContain(bannedId);

  // A second click on the exhausted Skip control must not consume another queued level.
  await canvas.click({position:{x:870,y:569}});
  expect((await readBrowserRunSnapshot(page)).queuedLevels).toBe(afterSkip.queuedLevels);

  // End this run through the guarded harness, then use the real New Run result button.
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestFinishRun();
  });
  await canvas.click({position:{x:640,y:446}});
  await page.waitForTimeout(220);
  const restarted=await readBrowserRunSnapshot(page);
  expect(restarted.level).toBe(1);
  expect(restarted.controls).toEqual({rerollsRemaining:2,banishesRemaining:1,skipsRemaining:1,bannedChoiceIds:[]});
  expect(pageErrors).toEqual([]);
});

test('accelerated run clock reaches the 14-minute boss trigger without waiting 14 real minutes', async ({ page }) => {
  const canvas=await startBrowserTestRun(page);
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skipTimedSystems?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestAdvanceElapsed(839_000,true);
  });
  expect((await readBrowserRunSnapshot(page)).bossSpawned).toBe(false);

  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skipTimedSystems?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestAdvanceElapsed(1_000,true);
  });
  const atBoss=await readBrowserRunSnapshot(page);
  expect(atBoss.elapsedMs).toBeGreaterThanOrEqual(840_000);
  expect(atBoss.bossSpawned).toBe(true);
  expect((await canvas.screenshot()).length).toBeGreaterThan(1_000);
});


test('enemy defeat rewards survive death and a full page reload', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);

  // rootbound-husk has 2 XP, so its real death handler awards floor(2 / 2) = 1 Ruh Özü.
  await defeatBrowserTestEnemy(page,'rootbound-husk');
  const afterKill=await readBrowserRunSnapshot(page);
  expect(afterKill.kills).toBe(1);
  expect(afterKill.runSoulEssence).toBe(1);

  await finishBrowserTestRun(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved).toBe(true);
  const deathResult=await readBrowserRunSnapshot(page);
  expect(deathResult.runFinished).toBe(true);
  expect(deathResult.lastRunSaved).toBe(true);

  const savedAfterDeath=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(savedAfterDeath.progression.soulEssence).toBe(1);
  expect(savedAfterDeath.progression.completedRuns).toBe(1);
  expect(savedAfterDeath.progression.unlockedRegionIds).toEqual(['cursed-forest']);

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const savedAfterReload=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(savedAfterReload.progression.soulEssence).toBe(1);
  expect(savedAfterReload.progression.completedRuns).toBe(1);
  expect(savedAfterReload.progression.unlockedRegionIds).toEqual(['cursed-forest']);
  expect(pageErrors).toEqual([]);
});

test('boss victory requires opening its chest and evolves an eligible weapon before saving', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await prepareBrowserTestBossChestEvolution(page);

  // Defeating the boss creates a physical chest; it must not finish the run by itself.
  await defeatBrowserTestBoss(page);
  const afterBoss=await readBrowserRunSnapshot(page);
  expect(afterBoss.bossChestAvailable).toBe(true);
  expect(afterBoss.bossVictoryPending).toBe(true);
  expect(afterBoss.runFinished).toBe(false);
  expect(afterBoss.lastRunSaved).toBeNull();
  expect(afterBoss.evolvedWeaponIds).toEqual([]);

  // Move the hunter onto the chest. The existing Phaser Arcade overlap opens it.
  await moveToBrowserTestBossChest(page);
  const movedToChest=await readBrowserRunSnapshot(page);
  expect(movedToChest.bossChestDiagnostics.playerBody.enabled).toBe(true);
  expect(movedToChest.bossChestDiagnostics.chestBody?.enabled).toBe(true);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.overlapCount,{timeout:3_000,message:'Player and boss chest bodies should produce a real Arcade overlap'}).toBeGreaterThan(0);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved).toBe(true);
  const victory=await readBrowserRunSnapshot(page);
  expect(victory.runFinished).toBe(true);
  expect(victory.bossChestAvailable).toBe(false);
  expect(victory.bossVictoryPending).toBe(false);
  expect(victory.runSoulEssence).toBe(180);
  expect(victory.evolvedWeaponIds).toContain('veil-bolt');
  expect(victory.lastRunSaved).toBe(true);

  const savedVictory=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(savedVictory.progression.soulEssence).toBe(180);
  expect(savedVictory.progression.completedRuns).toBe(1);
  expect(savedVictory.progression.unlockedRegionIds).toContain('forgotten-graveyard');

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const afterReload=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterReload.progression.soulEssence).toBe(180);
  expect(afterReload.progression.completedRuns).toBe(1);
  expect(afterReload.progression.unlockedRegionIds).toContain('forgotten-graveyard');
  expect(pageErrors).toEqual([]);
});

test('run results clearly report when browser storage refuses to save rewards', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await defeatBrowserTestEnemy(page,'rootbound-husk');

  // Simulate a full/read-only browser storage failure after the first profile was created.
  await page.evaluate(() => {
    Storage.prototype.setItem=function():void { throw new Error('Simulated storage write failure'); };
  });
  await finishBrowserTestRun(page);

  const failed=await readBrowserRunSnapshot(page);
  expect(failed.runFinished).toBe(true);
  expect(failed.lastRunSaved).toBe(false);
  const unchanged=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(unchanged.progression.soulEssence).toBe(0);
  expect(unchanged.progression.completedRuns).toBe(0);
  expect(pageErrors).toEqual([]);
});


test('timed run event starts, resolves its objective and awards persistent-run essence', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);

  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skipTimedSystems?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestAdvanceElapsed(210_000);
  });

  const started=await readBrowserRunSnapshot(page);
  expect(started.runEvents.active?.status).toBe('active');
  expect(started.runEvents.selected).toHaveLength(3);
  expect(new Set(started.runEvents.selected).size).toBe(3);

  await completeBrowserTestEvent(page);
  const completed=await readBrowserRunSnapshot(page);
  expect(completed.runEvents.active?.status).toBe('completed');
  expect(completed.runEvents.completed).toContain(started.runEvents.active?.kind);
  expect(completed.runSoulEssence).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
