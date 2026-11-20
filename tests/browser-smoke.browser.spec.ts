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
  expect(firstSave?.schemaVersion).toBe(10);
  expect(firstSave?.progression.unlockedCharacterIds).toContain('cursed-hunter');
  expect(firstSave?.progression.unlockedRegionIds).toContain('cursed-forest');

  // Reloading the page must retain the same profile rather than creating a new one.
  await page.reload();
  await expect(canvas).toBeVisible();
  const reloadedSave = await page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    return raw ? JSON.parse(raw) as { schemaVersion: number; profile: { createdAt: string } } : null;
  });
  expect(reloadedSave?.schemaVersion).toBe(10);
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
  paused:boolean;bossSpawned:boolean;bossChestAvailable:boolean;bossVictoryPending:boolean;
  regionMap:{regionId:string;roomIds:string[];wallCount:number;connected:boolean;playerWalkable:boolean};evolvedWeaponIds:string[];choices:{id:string;title:string;kind:string;contentId?:string;branchId?:string}[];
  runSoulEssence:number;runRelicIds:string[];equippedRelicIds:string[];runCraftingMaterials:Record<string,number>;kills:number;runFinished:boolean;lastRunSaved:boolean|null;bossHealth:number|null;
  health:number;maxHealth:number;damage:number;moveSpeed:number;permanentUpgradeEffects:{maxHealthBonus:number;damageMultiplier:number;moveSpeedMultiplier:number;armorBonus:number;xpGainMultiplier:number;extraRerolls:number};passives:{passiveId:string;level:number;special:boolean}[];activePassiveSpecialIds:string[];activeWeaponSynergyIds:string[];weaponSynergyTriggers:string[];
  availableStoryPathIds:string[];lastTraversedStoryPathId:string|null;
  storyWorldState:{npcId:string|null;npcName:string|null;npcFateId:string|null;npcFateLabel:string|null;atmosphereId:string|null;atmosphereName:string|null;renderedObjectCount:number};
  weapons:{weaponId:string;level:number;branchId:string|null;evolved:boolean;stats:{damage:number;intervalMs:number;range:number;projectiles:number;pierce:number;areaMultiplier:number;chainTargetBonus:number;branchName:string|null}|null}[];
  shotDiagnostics:{weaponId:string;damage:number}[];
  bossChestDiagnostics:{overlapCount:number;lastOverlapAtMs:number|null;collectCount:number;lastCollectAtMs:number|null;lastCollectObjectActive:boolean|null;lastCollectPending:boolean|null;collectOutcome:'none'|'entered'|'inactive'|'not-pending'|'opened';openedAtMs:number|null;finishScheduledAtMs:number|null;finishCallbackAtMs:number|null;finishTimer:{paused:boolean;hasDispatched:boolean;elapsed:number;delay:number;timeScale:number}|null;sceneTime:{paused:boolean;now:number;active:boolean};playerBody:{x:number;y:number;width:number;height:number;enabled:boolean};chestBody:{x:number;y:number;width:number;height:number;enabled:boolean}|null};
  controls:{rerollsRemaining:number;banishesRemaining:number;skipsRemaining:number;bannedChoiceIds:string[]};
  savedPermanentUpgradeLevels:Record<string,number>;saveLoadStatus:string;
  runEvents:{selected:string[];active:{kind:string;progress:number;stage:number;status:string}|null;completed:string[];failed:string[]};
};

async function startBrowserTestRun(page: import('@playwright/test').Page,unlockedPathIds:string[]=[]): Promise<import('@playwright/test').Locator> {
  await page.goto('/?bv-test=1');
  const canvas=page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {registry:{get:(key:string)=>unknown}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game&&game.registry.get('browserTestMode')===true);
  });
  if(unlockedPathIds.length)await page.evaluate(ids=>{
    const key='beyond-the-veil.save';const raw=window.localStorage.getItem(key);
    if(!raw)throw new Error('First-launch save was not created before story-path test setup.');
    const save=JSON.parse(raw) as {story:{unlockedPathIds:string[]}};
    save.story.unlockedPathIds=ids;window.localStorage.setItem(key,JSON.stringify(save));
  },unlockedPathIds);
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

async function probeBrowserElementReaction(page: import('@playwright/test').Page,first:string,second:string):Promise<{enemyReaction:string;bossReaction:string;enemyIceFrozen:boolean;bossIceFrozen:boolean}> {
  return page.evaluate(([a,b]) => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{getScene:(key:string)=>{browserTestElementReactionProbe:(first:string,second:string)=>{enemyReaction:string;bossReaction:string;enemyIceFrozen:boolean;bossIceFrozen:boolean}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestElementReactionProbe(a,b);
  },[first,second]);
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
      schemaVersion: 10,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0,
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {},
        permanentUpgrades: { maxHealth: 2, attackPower: 2, moveSpeed: 1, armor: 3, xpBonus: 2, rerolls: 2 },
        equippedRelicIds: [], equipmentProfiles: {}, activeEquipmentProfileIds: {}
      },
      collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] },
      story: { quests: {}, npcFates: {}, regionAtmospheres: {}, unlockedPathIds: [], bossEncounterIds: [], unlockedRewardIds: [], unlockedAlternateQuestIds: [], endingId: null, completedEndingId: null, appliedOutcomeIds: [] },
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
  expect(afterBoss.runRelicIds).not.toContain('matriarch-seed');
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
  expect(victory.runRelicIds).toContain('matriarch-seed');

  const savedVictory=await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(savedVictory.schemaVersion).toBe(10);
  expect(savedVictory.collections.relicIds).toContain('matriarch-seed');
  expect(savedVictory.collections.discoveredLoreIds).not.toContain('cursed-forest-lore'); // Story Archive records now require an actual in-run discovery.
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
  expect(completed.runRelicIds).toContain('forest-heart');
  await page.evaluate(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestFinishRun();
  });
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!).collections.craftingMaterials['living-root'])).toBe(1);
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(10);
  expect(saved.collections.craftingMaterials).toEqual({ 'living-root': 1 });
  expect(saved.collections.relicIds).toContain('forest-heart');
  expect(pageErrors).toEqual([]);
});


test('defeat preserves the selected hunter mastery baseline in the profile save', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await finishBrowserTestRun(page);
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(10);
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
  const relicProbe=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestRelicDamageProbe:()=>{baseDamage:number;shotDamage:number;relicMultiplier:number}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestRelicDamageProbe();
  });
  expect(relicProbe.relicMultiplier).toBeCloseTo(1.06,5);
  expect(relicProbe.shotDamage).toBeCloseTo(relicProbe.baseDamage*1.06,4);
  expect(pageErrors).toEqual([]);
});

test('first completed run grants and persists the first achievement after reload', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await finishBrowserTestRun(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.schemaVersion).toBe(10);
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


test('element reactions use the same live status rules for normal enemies and bosses',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await startBrowserTestRun(page);
 const result=await probeBrowserElementReaction(page,'fire','ice');
 expect(result.enemyReaction).toBe('thermal-shock');
 expect(result.bossReaction).toBe('thermal-shock');
 expect(result.enemyIceFrozen).toBe(true);
 expect(result.bossIceFrozen).toBe(true);
 expect(errors).toEqual([]);
});


test('uncompleted treasure hunt cannot grant an exploration relic', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await finishBrowserTestRun(page);
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.collections.relicIds).not.toContain('forest-heart');
  expect(pageErrors).toEqual([]);
});


type BossArenaSnapshot={
  bossId:string;bossVariantId:string|null;phaseIndex:number;phaseName:string;phaseAttackIds:string[];phaseAttackShapes:string[];phaseAddEnemyIds:string[];phaseDamageMultiplier:number;phaseMovementMultiplier:number;bossHealth:number;bossMaxHealth:number;bossDamageMultiplier:number;playerPoisonStacks:number;timeNow:number;
  objects:{id:string;kind:string;health:number;active:boolean;disabledUntil:number;revealed:boolean;isTrue:boolean;safe:boolean}[];
  traces:{id:string;motif:string;name:string}[];
};

async function callBossArena(page:import('@playwright/test').Page,name:string,args:unknown[]=[]):Promise<unknown>{
  return page.evaluate(({method,values})=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>unknown}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    const scene=game.scene.getScene('run') as Record<string,(...input:unknown[])=>unknown>;
    const action=scene[method];
    if(typeof action!=='function')throw new Error('Missing browser test method: '+method);
    return action.apply(scene,values);
  },{method:name,values:args});
}

test('all ten story boss variants are selected and applied in live Phaser boss encounters',async({page})=>{
  const cases=[
    ['cursed-forest','thorn-matriarch','thorn-matriarch-awakened'],
    ['cursed-forest','thorn-matriarch','thorn-matriarch-corrupted'],
    ['forgotten-graveyard','ossuary-king','ossuary-king-reckoning'],
    ['forgotten-graveyard','ossuary-king','ossuary-king-warhost'],
    ['deep-dungeon','furnace-colossus','furnace-colossus-dormant'],
    ['deep-dungeon','furnace-colossus','furnace-colossus-overheated'],
    ['rotten-swamp','mire-oracle','mire-oracle-awakened'],
    ['rotten-swamp','mire-oracle','mire-oracle-usurper'],
    ['cursed-castle','unwritten-regent','unwritten-regent-sealed'],
    ['cursed-castle','unwritten-regent','unwritten-regent-unbound']
  ] as const;
  await startBrowserTestRun(page);
  const phaseSignatures=new Set<string>();
  for(const [region,boss,encounterId] of cases){
    await callBossArena(page,'browserTestSpawnBossForRegion',[region,[encounterId]]);
    const snapshot=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
    expect(snapshot.bossId).toBe(boss);
    expect(snapshot.bossVariantId).toBe(encounterId);
    expect(snapshot.phaseIndex).toBe(0);
    expect(snapshot.phaseName.length).toBeGreaterThan(0);
    expect(snapshot.phaseAttackIds).toHaveLength(2);
    expect(snapshot.phaseAttackShapes).toHaveLength(2);
    expect(snapshot.phaseAddEnemyIds.length).toBeGreaterThan(0);
    expect(snapshot.phaseDamageMultiplier).toBeGreaterThan(0);
    expect(snapshot.phaseMovementMultiplier).toBeGreaterThan(0);
    phaseSignatures.add([snapshot.phaseName,snapshot.phaseAttackShapes.join(','),snapshot.phaseAddEnemyIds.join(','),snapshot.phaseDamageMultiplier,snapshot.phaseMovementMultiplier].join('|'));
    expect(snapshot.objects.length).toBeGreaterThan(0);
    const phaseResult=await callBossArena(page,'browserTestAdvanceBossPhase') as {phaseIndex:number;spawnedSupportEnemyIds:string[]};
    expect(phaseResult.phaseIndex).toBe(1);
    const advanced=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
    expect(advanced.phaseName).not.toBe(snapshot.phaseName);
    for(const enemyId of advanced.phaseAddEnemyIds)expect(phaseResult.spawnedSupportEnemyIds).toContain(enemyId);
  }
  expect(phaseSignatures.size).toBe(10);
  await callBossArena(page,'browserTestSpawnBossForRegion',['cursed-forest',[]]);
  const fallback=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
  expect(fallback.bossId).toBe('thorn-matriarch');
  expect(fallback.bossVariantId).toBeNull();
});

test('all five boss arenas interact with real Phaser overlaps, elements and phase changes',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await startBrowserTestRun(page);
  const cases=[
    {region:'cursed-forest',boss:'thorn-matriarch',kind:'root-pillar',id:'root-pillar-1',element:'fire'},
    {region:'forgotten-graveyard',boss:'ossuary-king',kind:'grave-marker',id:'grave-marker-1',element:'lightning'},
    {region:'deep-dungeon',boss:'furnace-colossus',kind:'gear',id:'gear-1',element:'ice'},
    {region:'rotten-swamp',boss:'mire-oracle',kind:'water-island',id:'',element:'fire'},
    {region:'cursed-castle',boss:'unwritten-regent',kind:'seal',id:'seal-1',element:'dark'}
  ] as const;
  for(const item of cases){
    await callBossArena(page,'browserTestSpawnBossForRegion',[item.region]);
    let snapshot=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
    expect(snapshot.bossId).toBe(item.boss);
    expect(snapshot.traces).toHaveLength(3);
    expect(new Set(snapshot.traces.map(trace=>trace.id)).size).toBe(3);
    expect(snapshot.traces.every(trace=>trace.id.length>8&&trace.name.length>4)).toBe(true);
    const expectedTraceMotif:Record<string,string>={'thorn-matriarch':'root-shrine','ossuary-king':'grave-epitaph','furnace-colossus':'forge-mark','mire-oracle':'oracle-rings','unwritten-regent':'veil-fracture'};
    expect(snapshot.traces.every(trace=>trace.motif===expectedTraceMotif[item.boss])).toBe(true);
    expect(snapshot.objects.filter(object=>object.kind===item.kind)).toHaveLength(item.kind==='root-pillar'||item.kind==='water-island'?3:4);

    if(item.boss==='thorn-matriarch'||item.boss==='ossuary-king'){
      const before=snapshot.objects.find(object=>object.id===item.id)!.health;
      await callBossArena(page,'browserTestHitArenaObject',[item.id,item.element]);
      await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).objects.find(object=>object.id===item.id)!.health).toBeLessThan(before);
    }else if(item.boss==='furnace-colossus'){
      await callBossArena(page,'browserTestHitArenaObject',[item.id,item.element]);
      await expect.poll(async()=>{const current=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;return current.objects.find(object=>object.id===item.id)!.disabledUntil-current.timeNow;}).toBeGreaterThan(9_000);
    }else if(item.boss==='mire-oracle'){
      const safe=snapshot.objects.find(object=>object.safe)!;
      expect(safe.kind).toBe('water-island');
      await callBossArena(page,'browserTestApplyBossPoison');
      await callBossArena(page,'browserTestTouchArenaObject',[safe.id]);
      await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).playerPoisonStacks).toBe(0);
    }else{
      await callBossArena(page,'browserTestHitArenaObject',['seal-1','dark']);
      await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).objects.some(object=>object.isTrue&&object.revealed)).toBe(true);
      snapshot=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
      const trueSeal=snapshot.objects.find(object=>object.isTrue)!;
      const before=trueSeal.health;
      await callBossArena(page,'browserTestHitArenaObject',[trueSeal.id,'spirit']);
      await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).objects.find(object=>object.id===trueSeal.id)!.health).toBeLessThan(before);
    }

    snapshot=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
    await callBossArena(page,'browserTestDamageBoss',[snapshot.bossMaxHealth*.45]);
    await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).phaseIndex).toBe(1);
    await callBossArena(page,'browserTestDamageBoss',[snapshot.bossMaxHealth*.5]);
    await expect.poll(async()=>((await callBossArena(page,'browserTestArenaSnapshot')) as BossArenaSnapshot).phaseIndex).toBe(2);
    const phaseThree=await callBossArena(page,'browserTestArenaSnapshot') as BossArenaSnapshot;
    if(item.boss==='mire-oracle')expect(phaseThree.objects.find(object=>object.safe)?.id).toBe('water-island-3');
    if(item.boss==='thorn-matriarch')expect(phaseThree.bossDamageMultiplier).toBeCloseTo(.7,4);
    if(item.boss==='unwritten-regent')expect(phaseThree.bossDamageMultiplier).toBeCloseTo(.6,4);
  }
  expect(errors).toEqual([]);
});
 
test('enemy support fields affect ally movement and soul-snipe fades after its shot in live Phaser',async({page})=>{
 const pageErrors:string[]=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 await startBrowserTestRun(page);
 const support=await page.evaluate(()=>{
  const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestEnemySupportProbe:()=>{hexSpeedMultiplier:number;webEnemySlowMultiplier:number;webPlayerSlowMultiplier:number}}}}}).__BEYOND_VEIL_GAME__;
  if(!game)throw new Error('Development browser test bridge is not available.');
  return game.scene.getScene('run').browserTestEnemySupportProbe();
 });
 expect(support.hexSpeedMultiplier).toBeCloseTo(1.15,1);
 expect(support.webEnemySlowMultiplier).toBeCloseTo(.5,1);
 expect(support.webPlayerSlowMultiplier).toBeCloseTo(.5,1);

 const fade=await page.evaluate(()=>{
  const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSoulSnipeFadeProbe:()=>Promise<{before:number;after:number;alpha:number}>}}}}).__BEYOND_VEIL_GAME__;
  if(!game)throw new Error('Development browser test bridge is not available.');
  return game.scene.getScene('run').browserTestSoulSnipeFadeProbe();
 });
 expect(fade.before).toBe(0);
 expect(fade.after).toBeGreaterThan(0);
 expect(fade.alpha).toBeLessThan(1);
 expect(pageErrors).toEqual([]);
});


test('all 24 selected weapon branches evolve and dispatch their authored live Phaser attack behavior',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const cases=[
    ['veil-bolt','veil-bolt-branch-focus','piercing-thrust'],['veil-bolt','veil-bolt-branch-spread','fan-volley'],
    ['gravecleaver','gravecleaver-branch-focus','piercing-thrust'],['gravecleaver','gravecleaver-branch-spread','orbiting-blades'],
    ['oath-pike','oath-pike-branch-focus','homing-projectile'],['oath-pike','oath-pike-branch-spread','fan-volley'],
    ['ember-chains','ember-chains-branch-focus','piercing-thrust'],['ember-chains','ember-chains-branch-spread','fan-volley'],
    ['winter-orbit','winter-orbit-branch-focus','cleaving-arc'],['winter-orbit','winter-orbit-branch-spread','defensive-pulse'],
    ['briar-seed','briar-seed-branch-focus','delayed-mortar'],['briar-seed','briar-seed-branch-spread','fan-volley'],
    ['soul-lantern','soul-lantern-branch-focus','piercing-thrust'],['soul-lantern','soul-lantern-branch-spread','fan-volley'],
    ['blood-loom','blood-loom-branch-focus','piercing-thrust'],['blood-loom','blood-loom-branch-spread','life-tether'],
    ['stormglass','stormglass-branch-focus','piercing-thrust'],['stormglass','stormglass-branch-spread','homing-projectile'],
    ['iron-bell','iron-bell-branch-focus','cleaving-arc'],['iron-bell','iron-bell-branch-spread','orbiting-blades'],
    ['rune-mortar','rune-mortar-branch-focus','delayed-mortar'],['rune-mortar','rune-mortar-branch-spread','area-seed'],
    ['eclipse-sigil','eclipse-sigil-branch-focus','delayed-mortar'],['eclipse-sigil','eclipse-sigil-branch-spread','delayed-sigil']
  ] as const;
  const results=await page.evaluate((paths)=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestEvolvedWeaponPath:(weaponId:string,branchId:string)=>{weaponId:string;branchId:string;evolved:boolean;evolutionName:string|undefined;behavior:string;executedBehavior:string|null;projectileCount:number;damagedTargetCount:number}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    const scene=game.scene.getScene('run');
    return paths.map(([weaponId,branchId])=>scene.browserTestEvolvedWeaponPath(weaponId,branchId));
  },cases.map(([weaponId,branchId])=>[weaponId,branchId]));
  expect(results).toHaveLength(24);
  for(let index=0;index<cases.length;index++){
    const [weaponId,branchId,behavior]=cases[index]!;
    const result=results[index]!;
    expect(result.weaponId).toBe(weaponId);
    expect(result.branchId).toBe(branchId);
    expect(result.evolved).toBe(true);
    expect(result.evolutionName).toBeTruthy();
    expect(result.behavior).toBe(behavior);
    expect(result.executedBehavior).toBe(behavior);
  }
  expect(pageErrors).toEqual([]);
});


test('schema-v8 profile migrates into persistent quest state in the live game and survives reload',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const now='2026-11-19T00:00:00.000Z';
    window.localStorage.setItem('beyond-the-veil.save',JSON.stringify({
      schemaVersion:8,profile:{createdAt:now,updatedAt:now},
      progression:{soulEssence:88,completedRuns:2,unlockedCharacterIds:['cursed-hunter'],unlockedRegionIds:['cursed-forest'],completedDifficulties:{},permanentUpgrades:{},equippedRelicIds:[],equipmentProfiles:{},activeEquipmentProfileIds:{}},
      collections:{characterMastery:{},unlockedCosmeticIds:[],discoveredLoreIds:[],relicIds:[],craftingMaterials:{},unlockedWeaponVariantIds:[],unlockedMasteryRewardIds:[],achievementProgress:{},completedAchievementIds:[],achievementPlayedCharacterIds:[],achievementExploredRegionIds:[],discoveredEnemyIds:[],discoveredWeaponIds:[],discoveredCharacterBioIds:[],completedCollectionIds:[],unlockedCollectionRewardIds:[]},
      settings:{}
    }));
  });
  await page.goto('/');
  const canvas=page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  const migrated=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(migrated.schemaVersion).toBe(10);
  expect(migrated.progression.soulEssence).toBe(88);
  expect(migrated.story.quests).toEqual({});
  expect(migrated.story.endingId).toBeNull();
  expect(migrated.story.completedEndingId).toBeNull();
  await page.reload();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.schemaVersion).toBe(10);
  expect(reloaded.story.unlockedPathIds).toEqual([]);
  expect(errors).toEqual([]);
});


test('live enemy and boss defeats advance the active quest and persist across defeat and reload',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await startBrowserTestRun(page);
  const call=(method:'browserTestDefeatQuestEnemy'|'browserTestDefeatBoss'|'browserTestFinishRun')=>page.evaluate((name)=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>Record<string,()=>void>}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run')[name]!();
  },method);
  const initial=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSnapshot:()=>{questProgress:Record<string,{status:string;objectiveProgress:Record<string,number>}>}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestSnapshot().questProgress;
  });
  expect(initial['forest-root-oath']?.status).toBe('active');
  await call('browserTestDefeatQuestEnemy');
  await call('browserTestDefeatQuestEnemy');
  await call('browserTestDefeatBoss');
  await call('browserTestFinishRun');
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.story.quests['forest-root-oath'].objectiveProgress['inspect-root-runes']).toBe(2);
  expect(saved.story.quests['forest-root-oath'].objectiveProgress['silence-root-corruption']).toBe(1);
  await page.reload();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.story.quests['forest-root-oath'].objectiveProgress['inspect-root-runes']).toBe(2);
  expect(reloaded.story.quests['forest-root-oath'].objectiveProgress['silence-root-corruption']).toBe(1);
  expect(errors).toEqual([]);
});


test('real Phaser exploration overlaps persist lore and secret paths on defeat and do not respawn after reload',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{if(!window.sessionStorage.getItem('__bv_exploration_test_cleaned')){window.localStorage.removeItem('beyond-the-veil.save');window.sessionStorage.setItem('__bv_exploration_test_cleaned','1');}});
  await startBrowserTestRun(page);
  const initial=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSnapshot:()=>{explorationLandmarks:{id:string;name:string;description:string;motif:string;decorationVisible:boolean}[]}}}}}).__BEYOND_VEIL_GAME__;
    return game!.scene.getScene('run').browserTestSnapshot().explorationLandmarks;
  });
  expect(initial).toHaveLength(2);
  expect(initial.map(item=>item.id)).toEqual(['cursed-forest-lore','cursed-forest-secret']);
  expect(initial.every(item=>item.name.length>0&&item.description.length>20&&item.decorationVisible)).toBe(true);
  expect(new Set(initial.map(item=>item.motif))).toEqual(new Set(['forest-camp']));
  const move=(kind:'lore'|'secret')=>page.evaluate((value)=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestMoveToExplorationPoint:(kind:'lore'|'secret')=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestMoveToExplorationPoint(value);
  },kind);
  await move('lore');
  await expect.poll(()=>page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSnapshot:()=>{discoveredLoreIds:string[]}}}}}).__BEYOND_VEIL_GAME__;
    return game?.scene.getScene('run').browserTestSnapshot().discoveredLoreIds.length??0;
  })).toBe(1);
  await move('secret');
  await expect.poll(()=>page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSnapshot:()=>{discoveredPathIds:string[]}}}}}).__BEYOND_VEIL_GAME__;
    return game?.scene.getScene('run').browserTestSnapshot().discoveredPathIds.length??0;
  })).toBe(1);
  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    game!.scene.getScene('run').browserTestFinishRun();
  });
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.collections.discoveredLoreIds).toContain('cursed-forest-lore');
  expect(saved.story.unlockedPathIds).toContain('cursed-forest-secret');
  await page.reload();
  await startBrowserTestRun(page);
  const snapshot=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestSnapshot:()=>{discoveredLoreIds:string[];discoveredPathIds:string[];explorationLandmarks:{id:string}[]}}}}}).__BEYOND_VEIL_GAME__;
    return game!.scene.getScene('run').browserTestSnapshot();
  });
  expect(snapshot.discoveredLoreIds).toEqual([]);
  expect(snapshot.discoveredPathIds).toEqual([]);
  expect(snapshot.explorationLandmarks).toEqual([]);
  expect(errors).toEqual([]);
});


test('saved main-quest choice opens and traverses only its matching live story passage',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page,['forest-mercy-path','grave-silent-gate','cursed-forest-secret']);
  const before=await readBrowserRunSnapshot(page);
  expect(before.availableStoryPathIds).toEqual(['forest-mercy-path']);
  expect(before.lastTraversedStoryPathId).toBeNull();

  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestMoveToStoryPath:(id:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestMoveToStoryPath('forest-mercy-path');
  });
  await expect.poll(async()=>(await readBrowserRunSnapshot(page)).lastTraversedStoryPathId).toBe('forest-mercy-path');
  const after=await readBrowserRunSnapshot(page);
  expect(after.playerX).toBeCloseTo(300,0);
  expect(after.playerY).toBeCloseTo(270,0);
  expect(pageErrors).toEqual([]);
});


test('saved story choices render the matching NPC fate and regional atmosphere in the live Phaser world',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await page.evaluate(()=>{
    const host=(window as Window & {__BEYOND_VEIL_GAME__?:{registry:{get:(key:string)=>unknown};scene:{getScene:(key:string)=>{scene:{restart:(data:{characterId:string;regionId:string})=>void}}}}}).__BEYOND_VEIL_GAME__;
    if(!host)throw new Error('Game bridge unavailable.');
    const manager=host.registry.get('saveManager') as {load:()=>{data:any};save:(value:any)=>void};
    const save=manager.load().data;
    save.story.npcFates['briar-warden']='spared';
    save.story.regionAtmospheres['cursed-forest']='quiet-growth';
    manager.save(save);
    host.scene.getScene('run').scene.restart({characterId:'cursed-hunter',regionId:'cursed-forest'});
  });
  await expect.poll(async()=>(await readBrowserRunSnapshot(page)).storyWorldState.npcFateId).toBe('spared');
  const state=(await readBrowserRunSnapshot(page)).storyWorldState;
  expect(state).toMatchObject({
    npcId:'briar-warden',
    npcName:'Diken Bekçisi',
    npcFateId:'spared',
    npcFateLabel:'YAŞAMINA İZİN VERİLDİ',
    atmosphereId:'quiet-growth',
    atmosphereName:'Sessiz Büyüme'
  });
  expect(state.renderedObjectCount).toBeGreaterThanOrEqual(8);
  expect(pageErrors).toEqual([]);
});


test('final story ending is completed only by the matching live final-boss victory and survives reload', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await startBrowserTestRun(page);

  await page.evaluate(() => {
    const host = (window as Window & { __BEYOND_VEIL_GAME__?: { registry: { get: (key: string) => unknown }; scene: { getScene: (key: string) => unknown } } }).__BEYOND_VEIL_GAME__;
    if (!host) throw new Error('Game bridge unavailable.');
    const manager = host.registry.get('saveManager') as { load: () => { data: any }; save: (value: any) => void };
    const save = manager.load().data;
    save.story.endingId = 'ending-mended-veil';
    save.story.quests['castle-veil-heir'] = {
      status: 'completed',
      objectiveProgress: { 'decode-regent-seals': 3, 'face-veil-echoes': 3 },
      chosenChoiceId: 'mend-the-veil',
      outcomeId: 'veil-mended'
    };
    save.story.appliedOutcomeIds.push('veil-mended');
    save.story.unlockedPathIds.push('castle-dawn-corridor');
    save.story.bossEncounterIds.push('unwritten-regent-sealed');
    manager.save(save);
    const scene = host.scene.getScene('run') as { questSaveData?: unknown };
    scene.questSaveData = save;
  });

  await page.evaluate(() => {
    const host = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSpawnBossForRegion: (region: string, encounters?: string[]) => void; browserTestDamageBoss: (amount: number) => void } } } }).__BEYOND_VEIL_GAME__;
    if (!host) throw new Error('Game bridge unavailable.');
    const scene = host.scene.getScene('run');
    scene.browserTestSpawnBossForRegion('cursed-castle', ['unwritten-regent-sealed']);
    scene.browserTestDamageBoss(100000);
  });
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).bossChestAvailable).toBe(true);
  await moveToBrowserTestBossChest(page);
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).bossChestDiagnostics.collectOutcome, { timeout: 5_000 }).toBe('opened');

  let queued = (await readBrowserRunSnapshot(page)).queuedLevels;
  while (queued > 0) {
    await page.locator('#game-container canvas').click({ position: { x: 520, y: 382 } });
    await expect.poll(async () => (await readBrowserRunSnapshot(page)).queuedLevels).toBeLessThan(queued);
    queued = (await readBrowserRunSnapshot(page)).queuedLevels;
  }
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).lastRunSaved, { timeout: 8_000 }).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.story.endingId).toBe('ending-mended-veil');
  expect(saved.story.completedEndingId).toBe('ending-mended-veil');

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const reloaded = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.story.completedEndingId).toBe('ending-mended-veil');
  expect(pageErrors).toEqual([]);
});

test('five regions apply their authored environmental hazards through the live Phaser scene',async({page})=>{
  await startBrowserTestRun(page);
  const cases=[
    {id:'forest-poison-bloom',region:'cursed-forest'},
    {id:'grave-cursed-tomb',region:'forgotten-graveyard'},
    {id:'dungeon-fire-trap',region:'deep-dungeon'},
    {id:'swamp-toxic-water',region:'rotten-swamp'},
    {id:'castle-dark-flame',region:'cursed-castle'}
  ];
  const trigger=async(id:string)=>page.evaluate(hazardId=>{
    const game=(window as Window&{__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestTriggerHazard:(id:string)=>{regionId:string;hazardId:string;telegraphMs:number;shape:string}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestTriggerHazard(hazardId);
  },id);
  const snapshot=async()=>page.evaluate(()=>{
    const game=(window as Window&{__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestHazardSnapshot:()=>{regionId:string;activeHazardId:string;lastEffectId:string;lastDamage:number;health:number;maxHealth:number;poisonStacks:number;slowActive:boolean;activeEnemyCount:number}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestHazardSnapshot();
  });
  for(const item of cases){
    const setup=await trigger(item.id);
    expect(setup.regionId).toBe(item.region);
    expect(setup.hazardId).toBe(item.id);
    expect(['circle','ring','line','cross']).toContain(setup.shape);
    await expect.poll(async()=>(await snapshot()).lastEffectId,{timeout:7_000,message:item.id+' should resolve after its warning'}).toBe(item.id);
    const result=await snapshot();
    expect(result.regionId).toBe(item.region);
    expect(result.lastDamage).toBeGreaterThan(0);
    expect(result.health).toBeLessThan(result.maxHealth);
  }
});

test('all five organic region maps load connected rooms and keep the hunter inside walkable geometry',async({page})=>{
  test.setTimeout(60_000);
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const regions=['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];
  for(const regionId of regions){
    await page.evaluate(id=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestRestartRegion:(region:string)=>void}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      game.scene.getScene('run').browserTestRestartRegion(id);
    },regionId);
    await expect.poll(async()=> (await readBrowserRunSnapshot(page)).regionMap.regionId,{timeout:5_000}).toBe(regionId);
    const map=(await readBrowserRunSnapshot(page)).regionMap;
    expect(map.roomIds).toHaveLength(6);
    expect(map.wallCount).toBeGreaterThan(100);
    expect(map.connected).toBe(true);
    expect(map.playerWalkable).toBe(true);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(6_000);
    await page.keyboard.up('ArrowLeft');
    const afterMove=await readBrowserRunSnapshot(page);
    expect(afterMove.playerX).toBeLessThan(800);
    expect(afterMove.regionMap.playerWalkable).toBe(true);
  }
  expect(pageErrors).toEqual([]);
});
