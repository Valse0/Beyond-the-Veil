import { expect, test } from '@playwright/test';

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
  expect(firstSave?.schemaVersion).toBe(8);
  expect(firstSave?.progression.unlockedCharacterIds).toContain('cursed-hunter');
  expect(firstSave?.progression.unlockedRegionIds).toContain('cursed-forest');

  // Reloading the page must retain the same profile rather than creating a new one.
  await page.reload();
  await expect(canvas).toBeVisible();
  const reloadedSave = await page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    return raw ? JSON.parse(raw) as { schemaVersion: number; profile: { createdAt: string } } : null;
  });
  expect(reloadedSave?.schemaVersion).toBe(8);
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

  // Verify movement in world coordinates. Screen pixels are camera-relative and can move
  // opposite to the hunter while the camera eases toward its follow target.
  await page.waitForTimeout(900);
  const initialHunterX = (await readBrowserRunSnapshot(page)).playerX;
  await page.keyboard.down('ArrowRight');
  let movedHunterX = initialHunterX;
  try {
    await page.waitForTimeout(400);
    movedHunterX = (await readBrowserRunSnapshot(page)).playerX;
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  expect(movedHunterX).toBeGreaterThan(initialHunterX + 4);

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


test('main menu supports keyboard focus, Hunter Hub access, return and New Run', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('main-menu'));
  });

  const initialMenu = await canvas.screenshot();
  await page.keyboard.press('ArrowRight');
  const hubFocusedMenu = await canvas.screenshot();
  expect(hubFocusedMenu.equals(initialMenu)).toBe(false);

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('hunter-hub'));
  });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('main-menu'));
  });

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('character-select'));
  });

  expect(pageErrors).toEqual([]);
});

test('main menu keeps pointer access to Hunter Hub', async ({ page }) => {
  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.mouse.click(460, 555);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('hunter-hub'));
  });
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
  paused:boolean;bossSpawned:boolean;bossChestAvailable:boolean;bossVictoryPending:boolean;evolvedWeaponIds:string[];choices:{id:string;title:string;kind:string;contentId?:string;branchId?:string}[];
  runSoulEssence:number;runRelicIds:string[];equippedRelicIds:string[];runCraftingMaterials:Record<string,number>;kills:number;runFinished:boolean;lastRunSaved:boolean|null;bossHealth:number|null;
  health:number;maxHealth:number;damage:number;moveSpeed:number;permanentUpgradeEffects:{maxHealthBonus:number;damageMultiplier:number;moveSpeedMultiplier:number;armorBonus:number;xpGainMultiplier:number;extraRerolls:number};passives:{passiveId:string;level:number;special:boolean}[];activePassiveSpecialIds:string[];activeWeaponSynergyIds:string[];weaponSynergyTriggers:string[];
  weapons:{weaponId:string;level:number;branchId:string|null;evolved:boolean;stats:{damage:number;intervalMs:number;range:number;projectiles:number;pierce:number;areaMultiplier:number;chainTargetBonus:number;branchName:string|null}|null}[];
  shotDiagnostics:{weaponId:string;damage:number}[];
  bossChestDiagnostics:{overlapCount:number;lastOverlapAtMs:number|null;collectCount:number;lastCollectAtMs:number|null;lastCollectObjectActive:boolean|null;lastCollectPending:boolean|null;collectOutcome:'none'|'entered'|'inactive'|'not-pending'|'opened';openedAtMs:number|null;finishScheduledAtMs:number|null;finishCallbackAtMs:number|null;finishTimer:{paused:boolean;hasDispatched:boolean;elapsed:number;delay:number;timeScale:number}|null;sceneTime:{paused:boolean;now:number;active:boolean};playerBody:{x:number;y:number;width:number;height:number;enabled:boolean};chestBody:{x:number;y:number;width:number;height:number;enabled:boolean}|null};
  controls:{rerollsRemaining:number;banishesRemaining:number;skipsRemaining:number;bannedChoiceIds:string[]};
  savedPermanentUpgradeLevels:Record<string,number>;saveLoadStatus:string;
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

async function prepareBrowserTestWeaponBranch(page: import('@playwright/test').Page,weaponId:string): Promise<void> {
  await page.evaluate(id => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestPrepareWeaponBranch:(value:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestPrepareWeaponBranch(id);
  },weaponId);
}

async function fireBrowserTestSelectedWeapon(page: import('@playwright/test').Page): Promise<{shotCount:number;damages:number[]}> {
  return page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestFireSelectedWeapon:()=>{shotCount:number;damages:number[]}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestFireSelectedWeapon();
  });
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

test('weapon level-three branch selection changes real Phaser attack output', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const canvas=await startBrowserTestRun(page);
  await prepareBrowserTestWeaponBranch(page,'veil-bolt');

  const available=await readBrowserRunSnapshot(page);
  expect(available.paused).toBe(true);
  expect(available.weapons).toHaveLength(1);
  expect(available.weapons[0]?.level).toBe(3);
  expect(available.weapons[0]?.branchId).toBeNull();
  expect(available.choices.filter(choice=>choice.kind==='weapon-branch')).toHaveLength(2);
  const spreadChoice=available.choices.find(choice=>choice.branchId?.endsWith('-branch-spread'));
  expect(spreadChoice).toBeDefined();

  // Select the right-hand branch card through the real Phaser canvas UI.
  await canvas.click({position:{x:530,y:382}});
  const selected=await readBrowserRunSnapshot(page);
  expect(selected.paused).toBe(false);
  expect(selected.weapons[0]?.branchId).toBe(spreadChoice?.branchId);
  expect(selected.weapons[0]?.stats?.projectiles).toBe(3);
  expect(selected.weapons[0]?.stats?.areaMultiplier).toBe(1.25);
  expect(selected.weapons[0]?.stats?.chainTargetBonus).toBe(1);

  // Fire through the live weapon scheduler; the branch must change actual projectile count.
  const fired=await fireBrowserTestSelectedWeapon(page);
  expect(fired.shotCount).toBe(3);
  expect(fired.damages).toHaveLength(3);
  expect(fired.damages.every(damage=>damage===selected.weapons[0]?.stats?.damage)).toBe(true);
  const afterFire=await readBrowserRunSnapshot(page);
  expect(afterFire.shotDiagnostics.filter(shot=>shot.weaponId==='veil-bolt')).toHaveLength(3);
  expect(pageErrors).toEqual([]);
});


test('owned passive changes its linked weapon attack through the live Phaser hit path', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const fired=await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestFireWeaponSynergy:(weaponId:string,passiveId:string)=>{activeSynergyIds:string[];primaryHealth:number;secondaryHealth:number;secondaryDamage:number}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestFireWeaponSynergy('veil-bolt','soul-vessel');
  });
  expect(fired.activeSynergyIds).toContain('veil-bolt-soul-vessel');
  expect(fired.secondaryDamage).toBeGreaterThan(0);
  const snapshot=await readBrowserRunSnapshot(page);
  expect(snapshot.activeWeaponSynergyIds).toContain('veil-bolt-soul-vessel');
  expect(snapshot.weaponSynergyTriggers).toContain('veil-bolt-soul-vessel');
  expect(pageErrors).toEqual([]);
});




test('Hunter Hub keyboard navigation can purchase a permanent upgrade and return to the menu', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 2,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 500, completedRuns: 0,
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {}
      },
      collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [] },
      settings: {}
    }));
  });
  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.mouse.click(430, 535);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('hunter-hub'));
  });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    const save = raw ? JSON.parse(raw) as { progression: { soulEssence: number; permanentUpgrades: Record<string, number> } } : null;
    return save ? { essence: save.progression.soulEssence, attackPower: save.progression.permanentUpgrades.attackPower ?? 0 } : null;
  })).toEqual({ essence: 425, attackPower: 1 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('main-menu'));
  });
});

test('Hunter Hub respec requires confirmation and refunds net investment after reload', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    // addInitScript runs again after page.reload(); preserve the respec result on reload.
    if (window.sessionStorage.getItem('bv-respec-fixture-seeded') === '1') return;
    window.sessionStorage.setItem('bv-respec-fixture-seeded', '1');
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 2,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0,
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: { maxHealth: 2, attackPower: 1 }
      },
      collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [] },
      settings: {}
    }));
  });

  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.mouse.click(430, 535);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('hunter-hub'));
  });

  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(40);
  }
  await page.keyboard.press('Enter');
  const dialog = await canvas.screenshot();
  expect(dialog.length).toBeGreaterThan(1_000);
  await page.keyboard.press('Escape');
  const hubAfterCancel = await canvas.screenshot();
  expect(hubAfterCancel.equals(dialog)).toBe(false);
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return { essence: save.progression.soulEssence, upgrades: save.progression.permanentUpgrades };
  })).toEqual({ essence: before.progression.soulEssence, upgrades: before.progression.permanentUpgrades });

  await page.mouse.click(1110, 660);
  await page.waitForTimeout(80);
  const pointerDialog = await canvas.screenshot();
  expect(pointerDialog.equals(hubAfterCancel)).toBe(false);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return { essence: save.progression.soulEssence, upgrades: save.progression.permanentUpgrades };
  })).toEqual({ essence: 202, upgrades: {} });

  await page.reload();
  await expect(canvas).toBeVisible();
  const afterReload = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterReload.progression.soulEssence).toBe(202);
  expect(afterReload.progression.permanentUpgrades).toEqual({});
  expect(pageErrors).toEqual([]);
});


test('permanent Hunter Hub upgrades affect actual run stats and level-up rerolls', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 8,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0,
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {},
        permanentUpgrades: { maxHealth: 2, attackPower: 2, moveSpeed: 1, armor: 3, xpBonus: 2, rerolls: 2 },
        equippedRelicIds: [], equipmentProfiles: {}, activeEquipmentProfileIds: {}
      },
      collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] },
      settings: {}
    }));
  });
  await startBrowserTestRun(page);
  const initial = await readBrowserRunSnapshot(page);
  expect(initial.saveLoadStatus).toBe('loaded');
  expect(initial.savedPermanentUpgradeLevels).toEqual({ maxHealth: 2, attackPower: 2, moveSpeed: 1, armor: 3, xpBonus: 2, rerolls: 2 });
  expect(initial.maxHealth).toBe(130);
  expect(initial.health).toBe(130);
  expect(initial.permanentUpgradeEffects).toEqual({
    maxHealthBonus: 30, damageMultiplier: 1.1, moveSpeedMultiplier: 1.04,
    armorBonus: 6, xpGainMultiplier: 1.16, extraRerolls: 2
  });
  expect(initial.controls.rerollsRemaining).toBe(4);

  const combatProbe = await page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestPermanentUpgradeProbe: () => { weaponDamage: number; healthBefore: number; healthAfter: number; moveSpeed: number } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestPermanentUpgradeProbe();
  });
  expect(combatProbe.weaponDamage).toBeCloseTo((initial.weapons[0]?.stats?.damage ?? 0) * 1.1, 4);
  expect(combatProbe.moveSpeed).toBeCloseTo(234, 4);
  expect(combatProbe.healthBefore).toBe(130);
  expect(combatProbe.healthAfter).toBeCloseTo(130 - 100 * (1 - 6 / 106), 4);

  await spawnBrowserTestXp(page, 10);
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).level).toBe(2);
  const leveled = await readBrowserRunSnapshot(page);
  expect(leveled.experience).toBeCloseTo(1.6, 4);
  expect(leveled.controls.rerollsRemaining).toBe(4);
});

test('all fourteen authored weapon synergies trigger through their real Phaser combat paths', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const pairs=[
    ['veil-bolt','soul-vessel','veil-bolt-soul-vessel'],
    ['gravecleaver','graveplate','gravecleaver-graveplate'],
    ['oath-pike','storm-conductor','oath-pike-storm-conductor'],
    ['ember-chains','ashen-heart','ember-chains-ashen-heart'],
    ['winter-orbit','frostbound-sigil','winter-orbit-frostbound-sigil'],
    ['briar-seed','venom-vial','briar-seed-venom-vial'],
    ['soul-lantern','soul-vessel','soul-lantern-soul-vessel'],
    ['blood-loom','blood-reliquary','blood-loom-blood-reliquary'],
    ['stormglass','storm-conductor','stormglass-storm-conductor'],
    ['iron-bell','wardens-knot','iron-bell-wardens-knot'],
    ['rune-mortar','ashen-heart','rune-mortar-ashen-heart'],
    ['eclipse-sigil','veil-thread','eclipse-sigil-veil-thread'],
    ['eclipse-sigil','hollow-crown','eclipse-sigil-hollow-crown'],
    ['soul-lantern','hollow-crown','soul-lantern-hollow-crown']
  ] as const;
  for(const [weaponId,passiveId,synergyId] of pairs){
    const result=await page.evaluate(([weapon,passive])=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestFireWeaponSynergy:(weaponId:string,passiveId:string)=>{activeSynergyIds:string[];synergyKind:string}}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('run').browserTestFireWeaponSynergy(weapon,passive);
    },[weaponId,passiveId]);
    expect(result.activeSynergyIds).toContain(synergyId);
    await expect.poll(async()=>{
      const snapshot=await readBrowserRunSnapshot(page);
      const diagnostics=await page.evaluate(()=>{
        const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSynergyDiagnostics:()=>{runFinished:boolean;scenePaused:boolean;clockPaused:boolean;sceneActive:boolean;sceneTimeNow:number;activeEnemyCount:number;playerHealth:number;passiveZoneCount:number}}}}}).__BEYOND_VEIL_GAME__;
        if(!game)throw new Error('Development browser test bridge is not available.');
        return game.scene.getScene('run').browserTestSynergyDiagnostics();
      });
      return JSON.stringify({triggered:snapshot.weaponSynergyTriggers.includes(synergyId),runFinished:diagnostics.runFinished,scenePaused:diagnostics.scenePaused,clockPaused:diagnostics.clockPaused,sceneActive:diagnostics.sceneActive,sceneTimeNow:diagnostics.sceneTimeNow,activeEnemyCount:diagnostics.activeEnemyCount,playerHealth:diagnostics.playerHealth,passiveZoneCount:diagnostics.passiveZoneCount});
    },{timeout:8_000,message:synergyId+' should execute; last scene/clock state is included'}).toContain('"triggered":true');
    const triggered=await readBrowserRunSnapshot(page);
    expect(triggered.weaponSynergyTriggers.filter(id=>id===synergyId)).toHaveLength(1);
    const diagnostics=await page.evaluate(()=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSynergyDiagnostics:()=>{targetDamageCount:number;targetHealth:number[];secondaryDamage:number;playerHealthBefore:number;playerHealthAfter:number;passiveZoneCount:number;guardActive:boolean;curseStacks:number}}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('run').browserTestSynergyDiagnostics();
    });
    switch(result.synergyKind){
      case 'spirit-splinter':
      case 'grave-aftershock':
      case 'ember-burst':
      case 'frost-ring':
      case 'spirit-chain':
      case 'storm-arc':
        expect(diagnostics.targetDamageCount,synergyId+' must damage secondary combat targets').toBeGreaterThan(1);
        break;
      case 'storm-lance':
        expect(diagnostics.targetDamageCount,synergyId+' must reach the additional chain target').toBe(4);
        break;
      case 'venom-trail':
      case 'magma-rift':
        expect(diagnostics.passiveZoneCount,synergyId+' must create its damaging ground zone').toBeGreaterThan(0);
        break;
      case 'blood-thread':
        expect(diagnostics.playerHealthAfter,synergyId+' must heal the hunter').toBeGreaterThan(diagnostics.playerHealthBefore);
        break;
      case 'ward-pulse':
        expect(diagnostics.guardActive,synergyId+' must activate damage reduction').toBe(true);
        break;
      case 'curse-sigil':
        expect(diagnostics.curseStacks,synergyId+' must apply a curse stack').toBeGreaterThan(0);
        break;
      case 'crown-sigil':
      case 'crown-guidance':
        expect(diagnostics.targetDamageCount,synergyId+' must damage its weakened priority target').toBeGreaterThan(0);
        break;
    }
  }
  expect(pageErrors).toEqual([]);
});

test('level-five passive special is selected through the real UI and Last Ward prevents one lethal hit', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const canvas=await startBrowserTestRun(page);
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestPreparePassiveSpecial:(id:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestPreparePassiveSpecial('wardens-knot');
  });
  const offered=await readBrowserRunSnapshot(page);
  expect(offered.paused).toBe(true);
  expect(offered.choices[0]?.kind).toBe('passive-special');
  expect(offered.choices[0]?.contentId).toBe('wardens-knot');
  await canvas.click({position:{x:310,y:382}});
  const selected=await readBrowserRunSnapshot(page);
  expect(selected.paused).toBe(false);
  expect(selected.passives).toEqual([{passiveId:'wardens-knot',level:5,special:true}]);
  expect(selected.activePassiveSpecialIds).toContain('wardens-knot');
  expect(selected.health).toBeGreaterThan(1);

  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestReceiveDamage:(amount:number)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestReceiveDamage(100000);
  });
  const protectedRun=await readBrowserRunSnapshot(page);
  expect(protectedRun.health).toBe(1);
  expect(protectedRun.runFinished).toBe(false);
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

  // Validate the chest body before moving the hunter. Once overlap fires, the chest
  // is intentionally destroyed, so inspecting it afterward would be a race.
  const beforeApproach=await readBrowserRunSnapshot(page);
  expect(beforeApproach.bossChestDiagnostics.playerBody.enabled).toBe(true);
  expect(beforeApproach.bossChestDiagnostics.chestBody).not.toBeNull();
  expect(beforeApproach.bossChestDiagnostics.chestBody?.enabled).toBe(true);
  expect(beforeApproach.bossChestDiagnostics.chestBody?.width).toBeGreaterThan(0);
  expect(beforeApproach.bossChestDiagnostics.chestBody?.height).toBeGreaterThan(0);

  // Probe each hand-off independently: Arcade overlap -> collection handler -> chest open ->
  // victory timer -> finishRun callback -> persisted result. This identifies the exact broken stage.
  await moveToBrowserTestBossChest(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.overlapCount,{timeout:3_000,message:'Player and boss chest bodies should produce a real Arcade overlap'}).toBeGreaterThan(0);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.collectCount,{timeout:3_000,message:'Arcade overlap should enter the run-event collection handler'}).toBeGreaterThan(0);
  const afterCollect=await readBrowserRunSnapshot(page);
  expect(afterCollect.bossChestDiagnostics.lastCollectObjectActive).toBe(true);
  expect(afterCollect.bossChestDiagnostics.lastCollectPending).toBe(true);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.collectOutcome,{timeout:3_000,message:'Collection handler should open the pending boss chest'}).toBe('opened');
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.finishScheduledAtMs,{timeout:3_000,message:'Opening the chest should schedule the victory completion callback'}).not.toBeNull();

  // The boss also drops 80 XP at the chest location. Collecting it can open one or
  // more real level-up overlays and pause the Phaser clock, so resolve each choice
  // through the visible card UI before asserting that the victory timer can finish.
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels,{timeout:3_000,message:'Boss XP should be collected at the chest'}).toBeGreaterThan(0);
  let pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  expect(pendingLevels).toBeGreaterThan(0);
  while(pendingLevels>0){
    const beforeChoice=await readBrowserRunSnapshot(page);
    expect(beforeChoice.paused).toBe(true);
    expect(beforeChoice.choices).toHaveLength(4);
    await page.locator('#game-container canvas').click({position:{x:520,y:382}});
    await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels,{message:'Selecting a level-up card should consume one queued level'}).toBeLessThan(pendingLevels);
    pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  }
  // The 500 ms timer may finish on the same frame that the last level-up choice
  // resumes the clock. finishRun() then pauses the scene again, so an intermediate
  // "paused === false" or live-clock assertion is inherently timing-dependent.
  // The durable contract is that the scheduled callback fires after its full delay.
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.finishCallbackAtMs,{timeout:8_000,message:'Scheduled victory completion callback should execute after the timer delay'}).not.toBeNull();
  const completedTimer=await readBrowserRunSnapshot(page);
  expect(completedTimer.bossChestDiagnostics.finishTimer).not.toBeNull();
  expect(completedTimer.bossChestDiagnostics.finishTimer?.hasDispatched).toBe(true);
  expect(completedTimer.bossChestDiagnostics.finishCallbackAtMs!-completedTimer.bossChestDiagnostics.finishScheduledAtMs!).toBeGreaterThanOrEqual(500);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved,{timeout:3_000,message:'Victory completion should persist the run result'}).toBe(true);
  const victory=await readBrowserRunSnapshot(page);
  expect(victory.runFinished).toBe(true);
  expect(victory.bossChestAvailable).toBe(false);
  expect(victory.bossVictoryPending).toBe(false);
  expect(victory.runSoulEssence).toBeGreaterThanOrEqual(180);
  expect(victory.evolvedWeaponIds).toContain('veil-bolt');
  expect(victory.lastRunSaved).toBe(true);

  const savedVictory=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(savedVictory.schemaVersion).toBe(8);
  expect(savedVictory.collections.relicIds).toContain('matriarch-seed');
  expect(savedVictory.collections.discoveredLoreIds).toContain('cursed-forest-lore');
  expect(savedVictory.progression.soulEssence).toBe(victory.runSoulEssence);
  expect(savedVictory.progression.completedRuns).toBe(1);
  expect(savedVictory.collections.characterMastery['cursed-hunter']).toBeGreaterThanOrEqual(13);
  expect(savedVictory.progression.unlockedRegionIds).toContain('forgotten-graveyard');

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const afterReload=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterReload.progression.soulEssence).toBe(victory.runSoulEssence);
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


test('completed treasure hunt grants and persists its regional crafting material', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);

  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestCompleteTreasureHunt:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestCompleteTreasureHunt();
  });

  const completed=await readBrowserRunSnapshot(page);
  expect(completed.runCraftingMaterials).toEqual({ 'living-root': 1 });
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestFinishRun();
  });
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!).collections.craftingMaterials['living-root'])).toBe(1);
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(8);
  expect(saved.collections.craftingMaterials).toEqual({ 'living-root': 1 });
  expect(pageErrors).toEqual([]);
});


test('defeat preserves the selected hunter mastery baseline in the profile save', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await finishBrowserTestRun(page);
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(8);
  expect(saved.progression.completedRuns).toBe(1);
  expect(saved.collections.characterMastery['cursed-hunter']).toBe(3);
  expect(saved.collections.unlockedMasteryRewardIds).toEqual([]);
  expect(pageErrors).toEqual([]);
});


test('active equipment profile overrides the selected hunter loadout when a run begins', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 8,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0,
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {}, equippedRelicIds: [],
        equipmentProfiles: {
          'cursed-hunter': [{
            id: 'profile-browser-check', characterId: 'cursed-hunter', name: 'Grave test',
            startingWeaponId: 'gravecleaver', startingPassiveId: 'graveplate',
            relicIds: ['matriarch-seed']
          }]
        },
        activeEquipmentProfileIds: { 'cursed-hunter': 'profile-browser-check' }
      },
      collections: {
        characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [],
        relicIds: ['matriarch-seed'], craftingMaterials: {},
        unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
      },
      settings: {}
    }));
  });
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const snapshot = await readBrowserRunSnapshot(page);
  expect(snapshot.weapons[0]?.weaponId).toBe('gravecleaver');
  expect(snapshot.passives[0]?.passiveId).toBe('graveplate');
  expect(snapshot.equippedRelicIds).toEqual(['matriarch-seed']);
  expect(pageErrors).toEqual([]);
});

test('first completed run grants and persists the first achievement after reload', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await finishBrowserTestRun(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(8);
  expect(saved.collections.completedAchievementIds).toContain('first-descent');
  expect(saved.collections.unlockedCosmeticIds).toContain('ashen-hunter');
  expect(saved.collections.discoveredWeaponIds).toContain('veil-bolt');
  expect(saved.collections.discoveredCharacterBioIds).toContain('cursed-hunter');
  await page.reload();
  const reloaded = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.collections.completedAchievementIds).toContain('first-descent');
  expect(reloaded.collections.unlockedCosmeticIds).toContain('ashen-hunter');
  expect(pageErrors).toEqual([]);
});
