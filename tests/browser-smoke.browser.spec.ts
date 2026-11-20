import { expect, test } from '@playwright/test';

type QuestJournalBrowserSnapshot = {
  selectedRegionId: string;
  regions: { id: string; unlocked: boolean; completedCount: number; questCount: number }[];
  selected: {
    id: string;
    quests: { id: string; status: string; objectiveProgress: { id: string; current: number; target: number }[]; chosenChoiceLabel: string | null; outcomeSummary: string | null }[];
    npcFateLabel: string | null;
    atmosphereName: string | null;
    bossVariantName: string | null;
    unlockedPathNames: string[];
    discoveredLoreIds: string[];
  };
  completedEndingIds: string[];
  completedEndingLabels: string[];
  discoveredLoreIds: string[];
  returnScene: string;
};

async function readQuestJournalSnapshot(page: import('@playwright/test').Page): Promise<QuestJournalBrowserSnapshot> {
  return page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => QuestJournalBrowserSnapshot } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('quest-journal').browserTestSnapshot();
  });
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
  expect(firstSave?.schemaVersion).toBe(11);
  expect(firstSave?.progression.unlockedCharacterIds).toContain('cursed-hunter');
  expect(firstSave?.progression.unlockedRegionIds).toContain('cursed-forest');

  // Reloading the page must retain the same profile rather than creating a new one.
  await page.reload();
  await expect(canvas).toBeVisible();
  const reloadedSave = await page.evaluate(() => {
    const raw = window.localStorage.getItem('beyond-the-veil.save');
    return raw ? JSON.parse(raw) as { schemaVersion: number; profile: { createdAt: string } } : null;
  });
  expect(reloadedSave?.schemaVersion).toBe(11);
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
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run-preparation'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run'));
  });
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

  // Click the actual center of the "DEVAM ET" button (y = 48% of the 720px canvas).
  // Assert the live Phaser state rather than relying on a small clock screenshot changing.
  await page.mouse.click(640, 346);
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).paused, {
    message: 'clicking DEVAM ET should resume the run'
  }).toBe(false);
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).elapsedMs, {
    message: 'the run clock should advance after resuming'
  }).toBeGreaterThan(pausedSnapshot.elapsedMs);

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
  newGamePlusLevel:number;newGamePlusModifiers:{enemyHealthMultiplier:number;enemyDamageMultiplier:number;enemyMoveSpeedMultiplier:number;bossHealthMultiplier:number;bossDamageMultiplier:number;bossMoveSpeedMultiplier:number};gameMode:'survival'|'boss-hunt'|'challenge'|'endless';challengeId:string|null;challengeModifiers:{maxWeaponSlots:number;maxHealthMultiplier:number;enemyMoveSpeedMultiplier:number;victorySoulEssenceBonus:number};weaponSlotsUsed:number;waveSpawnIndex:number;activeEnemyCount:number;endless:{bossCyclesCompleted:number;nextBossAtMs:number;ruleId:string|null;ruleName:string|null;ruleModifiers:{enemyHealthMultiplier:number;enemyMoveSpeedMultiplier:number;incomingDamageMultiplier:number;experienceMultiplier:number}};
  ability:{effect:string;cooldownRemainingMs:number;guardActive:boolean;lastDamage:number;lastHealing:number;markedTargetCount:number;sceneTimePaused:boolean};
  level:number;experience:number;experienceToNext:number;queuedLevels:number;elapsedMs:number;playerX:number;playerY:number;
  paused:boolean;bossSpawned:boolean;bossChestAvailable:boolean;bossVictoryPending:boolean;
  regionMap:{regionId:string;roomIds:string[];wallCount:number;connected:boolean;playerWalkable:boolean};environment:{timeOfDay:string;weather:string;timeLabel:string;weatherLabel:string;enemyMoveSpeedMultiplier:number;elementDamageMultipliers:Record<string,number>};evolvedWeaponIds:string[];choices:{id:string;title:string;kind:string;contentId?:string;branchId?:string}[];
  runSoulEssence:number;runRelicIds:string[];equippedRelicIds:string[];runCraftingMaterials:Record<string,number>;kills:number;runFinished:boolean;lastRunSaved:boolean|null;bossHealth:number|null;bossMaxHealth:number|null;
  questProgress:Record<string,{status:'active'|'completed';objectiveProgress:Record<string,number>}>;
  questChoice:{questId:string;choiceIds:string[]}|null;questChoiceTexts:string[];questTrackerText:string;
  explorationLandmarks:{id:string;kind:string;name:string;description:string;motif:string;decorationVisible:boolean}[];
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

async function startBrowserTestRun(page: import('@playwright/test').Page,unlockedPathIds:string[]=[],gameMode:'survival'|'boss-hunt'|'challenge'|'endless'='survival',challengeId:'limited-arsenal'|'glass-oath'|'hunters-nightmare'='limited-arsenal'): Promise<import('@playwright/test').Locator> {
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
  if(gameMode==='boss-hunt'){
    await page.mouse.click(544,588);
    await page.mouse.click(1124,644);
  }else if(gameMode==='endless'){
    await page.mouse.click(928,588);
    await page.mouse.click(1124,644);
  }else if(gameMode==='challenge'){
    await page.mouse.click(736,588);
    const challengeX:Record<string,number>={'limited-arsenal':450,'glass-oath':640,'hunters-nightmare':830};
    await page.mouse.click(challengeX[challengeId]!,640);
    await page.mouse.click(1124,644);
  }else{
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(180);
  await page.waitForFunction(() => {
    const game=(window as Window & {__BEYOND_VEIL_GAME__?: {scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run-preparation'));
  });
  await page.keyboard.press('Enter');
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
        soulEssence: 0, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
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
  // Move off hovered UI without blurring the game canvas; keyboard navigation stays active.
  await page.mouse.move(640, 360);
  await page.waitForTimeout(80);
  const readHubSelection = async () => page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { selectedIndex: number } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('hunter-hub').browserTestSnapshot().selectedIndex;
  });
  // Open the respec action through its pointer target; keyboard is still
  // exercised for the confirmation dialog itself.
  const respecPoint = await canvas.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const gameCanvas = element as HTMLCanvasElement;
    return { x: bounds.left + bounds.width * (1130 / gameCanvas.width), y: bounds.top + bounds.height * (660 / gameCanvas.height) };
  });
  await page.mouse.click(respecPoint.x, respecPoint.y);
  await page.waitForTimeout(100);
  const dialog = await canvas.screenshot();
  expect(dialog.length).toBeGreaterThan(1_000);
  await page.keyboard.press('Escape');
  const hubAfterCancel = await canvas.screenshot();
  expect(hubAfterCancel.equals(dialog)).toBe(false);
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return { essence: save.progression.soulEssence, upgrades: save.progression.permanentUpgrades };
  })).toEqual({ essence: before.progression.soulEssence, upgrades: before.progression.permanentUpgrades });

  await page.mouse.click(respecPoint.x, respecPoint.y);
  await expect.poll(async () => page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { respecDialogOpen: boolean } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('hunter-hub').browserTestSnapshot().respecDialogOpen;
  })).toBe(true);
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



test('Hunter Hub Blacksmith crafts one affordable variant, blocks repeat/unaffordable crafts and persists after reload', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('bv-blacksmith-fixture-seeded') === '1') return;
    window.sessionStorage.setItem('bv-blacksmith-fixture-seeded', '1');
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 11,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 500, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {},
        equippedRelicIds: [], equipmentProfiles: {}, activeEquipmentProfileIds: {}
      },
      collections: {
        characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: [],
        craftingMaterials: { 'living-root': 2 }, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [],
        achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [],
        achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [],
        discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
      },
      story: {
        quests: {}, npcFates: {}, regionAtmospheres: {}, unlockedPathIds: [], bossEncounterIds: [],
        unlockedRewardIds: [], unlockedAlternateQuestIds: [], endingId: null, completedEndingId: null,
        appliedOutcomeIds: []
      },
      settings: {}
    }));
  });

  const openBlacksmith = async () => {
    await page.mouse.click(430, 535);
    await page.waitForFunction(() => {
      const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
      return Boolean(game?.scene.isActive('hunter-hub'));
    });
    const readHubSelection = async () => page.evaluate(() => {
      const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { selectedIndex: number } } } } }).__BEYOND_VEIL_GAME__;
      if (!game) throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('hunter-hub').browserTestSnapshot().selectedIndex;
    });
    // Enter through the visible Blacksmith pointer target; this test focuses
    // on crafting and persistence rather than duplicating hub navigation coverage.
    const entryPoint = await page.locator('#game-container canvas').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const gameCanvas = element as HTMLCanvasElement;
      return { x: bounds.left + bounds.width * (1158 / gameCanvas.width), y: bounds.top + bounds.height * (114 / gameCanvas.height) };
    });
    await page.mouse.click(entryPoint.x, entryPoint.y);
    await page.waitForTimeout(100);
    const snapshot = await page.evaluate(() => {
      const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { screen: string; selectedRecipeId: string | null; recipeIds: string[]; craftableRecipeIds: string[] } } } } }).__BEYOND_VEIL_GAME__;
      if (!game) throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('hunter-hub').browserTestSnapshot();
    });
    expect(snapshot.screen).toBe('blacksmith');
    expect(snapshot.selectedRecipeId).toBe('recipe-verdant-spread');
    expect(snapshot.recipeIds).toHaveLength(5);
    return snapshot;
  };

  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await openBlacksmith();
  const blacksmithView = await canvas.screenshot();
  expect(blacksmithView.length).toBeGreaterThan(1_000);

  // Pointer activation is the same path used by touch on the recipe card.
  // Convert Phaser's logical 1280x720 coordinates to the canvas's actual viewport bounds.
  const recipeButtonPoint = await canvas.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const gameCanvas = element as HTMLCanvasElement;
    return {
      x: bounds.left + bounds.width * (1158 / gameCanvas.width),
      y: bounds.top + bounds.height * (171 / gameCanvas.height)
    };
  });
  await page.mouse.click(recipeButtonPoint.x, recipeButtonPoint.y);
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return {
      essence: save.progression.soulEssence,
      materials: save.collections.craftingMaterials,
      variants: save.collections.unlockedWeaponVariantIds
    };
  })).toEqual({ essence: 360, materials: {}, variants: ['briar-seed-verdant-variant'] });

  await page.reload();
  await expect(canvas).toBeVisible();
  const reloadedBlacksmith = await openBlacksmith();

  expect(reloadedBlacksmith.craftableRecipeIds).not.toContain('recipe-verdant-spread');
  // A crafted recipe and a recipe missing its regional material must both be inert.
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return {
      essence: save.progression.soulEssence,
      materials: save.collections.craftingMaterials,
      variants: save.collections.unlockedWeaponVariantIds
    };
  })).toEqual({ essence: 360, materials: {}, variants: ['briar-seed-verdant-variant'] });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(60);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('main-menu'));
  });
  expect(pageErrors).toEqual([]);
});


test('run preparation selects a saved equipment profile and applies its real loadout to the run', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 11,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {}, equippedRelicIds: [],
        equipmentProfiles: {
          'cursed-hunter': [{
            id: 'prep-profile-1', characterId: 'cursed-hunter', name: 'Alev',
            startingWeaponId: 'gravecleaver', startingPassiveId: 'storm-conductor',
            relicIds: ['forest-heart']
          }]
        },
        activeEquipmentProfileIds: {}
      },
      collections: {
        characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: ['forest-heart'],
        craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [],
        achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [],
        achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [],
        discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
      },
      story: {
        quests: {}, npcFates: {}, regionAtmospheres: {}, unlockedPathIds: [], bossEncounterIds: [],
        unlockedRewardIds: [], unlockedAlternateQuestIds: [], endingId: null, completedEndingId: null,
        appliedOutcomeIds: []
      },
      settings: {}
    }));
  });
  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.mouse.click(160, 555);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('character-select'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('region-select'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run-preparation'));
  });
  const initial = await page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { selectedProfileId: string | null; selectedWeaponId: string; selectedPassiveId: string; selectedRelicIds: string[]; profileCount: number } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run-preparation').browserTestSnapshot();
  });
  expect(initial.profileCount).toBe(1);
  expect(initial.selectedProfileId).toBeNull();
  await page.keyboard.press('ArrowRight');
  const selected = await page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { selectedProfileId: string | null; selectedWeaponId: string; selectedPassiveId: string; selectedRelicIds: string[] } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run-preparation').browserTestSnapshot();
  });
  expect(selected).toMatchObject({
    selectedProfileId: 'prep-profile-1',
    selectedWeaponId: 'gravecleaver',
    selectedPassiveId: 'storm-conductor',
    selectedRelicIds: ['forest-heart']
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run'));
  });
  const run = await readBrowserRunSnapshot(page);
  expect(run.weapons[0]?.weaponId).toBe('gravecleaver');
  expect(run.passives[0]?.passiveId).toBe('storm-conductor');
  expect(run.equippedRelicIds).toEqual(['forest-heart']);
  const activeProfile = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!).progression.activeEquipmentProfileIds['cursed-hunter'] ?? null);
  expect(activeProfile).toBeNull();
  expect(pageErrors).toEqual([]);
});

test('Hunter Hub equipment profiles create, edit, activate, persist and delete per-hunter loadouts', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('bv-equipment-fixture-seeded') === '1') return;
    window.sessionStorage.setItem('bv-equipment-fixture-seeded', '1');
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 11,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {}, equippedRelicIds: [],
        equipmentProfiles: {}, activeEquipmentProfileIds: {}
      },
      collections: {
        characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: ['forest-heart'],
        craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [],
        achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [],
        achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [],
        discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
      },
      story: {
        quests: {}, npcFates: {}, regionAtmospheres: {}, unlockedPathIds: [], bossEncounterIds: [],
        unlockedRewardIds: [], unlockedAlternateQuestIds: [], endingId: null, completedEndingId: null,
        appliedOutcomeIds: []
      },
      settings: {}
    }));
  });

  const canvas = page.locator('#game-container canvas');
  const snapshot = async () => page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSnapshot: () => { screen: string; equipmentProfileIds: string[]; activeEquipmentProfileId: string | null } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('hunter-hub').browserTestSnapshot();
  });
  const openProfiles = async () => {
    await page.goto('/?bv-test=1');
    await expect(canvas).toBeVisible();
    await page.mouse.click(430, 535);
    await page.waitForFunction(() => {
      const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
      return Boolean(game?.scene.isActive('hunter-hub'));
    });
    await page.mouse.click(970, 114);
    await expect.poll(async () => (await snapshot()).screen).toBe('equipment-profiles');
  };

  await openProfiles();
  await page.mouse.click(184, 644); // Create the first profile.
  await expect.poll(async () => (await snapshot()).screen).toBe('equipment-editor');
  const nameInput = page.locator('input[aria-label="Dizilim adı"]');
  await expect(nameInput).toBeVisible();
  await nameInput.fill('Alev');
  await nameInput.evaluate((element: HTMLInputElement) => element.blur());
  await page.mouse.click(1000, 222); // Gravecleaver.
  await page.mouse.click(1000, 284); // Storm Conductor.
  await page.mouse.click(1000, 346); // The owned Forest Heart.
  await page.mouse.click(528, 600); // Save.
  await expect.poll(async () => (await snapshot()).equipmentProfileIds.length).toBe(1);

  let saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  let profile = saved.progression.equipmentProfiles['cursed-hunter'][0];
  expect(profile.name).toBe('Alev');
  expect(profile.startingWeaponId).toBe('gravecleaver');
  expect(profile.startingPassiveId).toBe('storm-conductor');
  expect(profile.relicIds).toEqual(['forest-heart']);

  // Edit the same profile and verify that its identity remains stable.
  await page.mouse.click(640, 191); // Select the profile.
  await page.mouse.click(640, 644); // Edit action.
  await expect.poll(async () => (await snapshot()).screen).toBe('equipment-editor');
  await page.mouse.click(1000, 222); // Oath Pike.
  await page.mouse.click(528, 600); // Save.
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return save.progression.equipmentProfiles['cursed-hunter'][0].startingWeaponId;
  })).toBe('oath-pike');

  // Activate, reload, and confirm the per-hunter active profile survives.
  await page.mouse.click(640, 191); // Select the profile.
  await page.mouse.click(412, 644); // Activate.
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return save.progression.activeEquipmentProfileIds['cursed-hunter'];
  })).toBe(profile.id);
  await page.reload();
  await expect(canvas).toBeVisible();
  await openProfiles();
  const afterReload = await snapshot();
  expect(afterReload.equipmentProfileIds).toEqual([profile.id]);
  expect(afterReload.activeEquipmentProfileId).toBe(profile.id);

  // Delete requires a separate confirmation and clears the active pointer safely.
  await page.mouse.click(640, 191); // Select the profile.
  await page.mouse.click(868, 644); // Delete.
  await expect.poll(async () => (await snapshot()).screen).toBe('equipment-delete-confirm');
  await page.mouse.click(752, 460); // Confirm deletion.
  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!);
    return {
      profiles: save.progression.equipmentProfiles['cursed-hunter'] ?? [],
      active: save.progression.activeEquipmentProfileIds['cursed-hunter'] ?? null
    };
  })).toEqual({ profiles: [], active: null });
  expect(pageErrors).toEqual([]);
});

test('permanent Hunter Hub upgrades affect actual run stats and level-up rerolls', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 11,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
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
  expect(savedVictory.schemaVersion).toBe(11);
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


test('event HUD displays objective, live progress and remaining time in Phaser',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await startBrowserTestRun(page);
  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skipTimedSystems?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestAdvanceElapsed(210_000);
  });
  const started=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestHudSnapshot:()=>unknown}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestHudSnapshot();
  }) as {event:{visible:boolean;title:string;objective:string;timer:string;progressRatio:number}};
  expect(started.event.visible).toBe(true);
  expect(started.event.title.length).toBeGreaterThan(2);
  expect(started.event.objective.length).toBeGreaterThan(3);
  expect(['00:40','00:50','00:55','01:10','01:15']).toContain(started.event.timer);
  expect(started.event.progressRatio).toBe(0);
  await completeBrowserTestEvent(page);
  const completed=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestHudSnapshot:()=>unknown}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestHudSnapshot();
  }) as {event:{visible:boolean;objective:string;timer:string;progressRatio:number}};
  expect(completed.event.visible).toBe(true);
  expect(completed.event.objective).toBe('HEDEF TAMAMLANDI');
  expect(completed.event.timer).toBe('TAMAMLANDI');
  expect(completed.event.progressRatio).toBe(1);
  expect(errors).toEqual([]);
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
  expect(saved.schemaVersion).toBe(11);
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
  expect(saved.schemaVersion).toBe(11);
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
  expect(saved.schemaVersion).toBe(11);
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

test('boss HUD displays health, phase progression and arena counter-hint in live Phaser combat',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await startBrowserTestRun(page);
  await callBossArena(page,'browserTestSpawnBossForRegion',['cursed-forest',[]]);
  const readHud=async()=>page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestHudSnapshot:()=>unknown}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestHudSnapshot();
  }) as Promise<{boss:{visible:boolean;title:string;phase:string;healthText:string;hint:string;health:number|null;maxHealth:number|null;barRatio:number}}>;
  const initial=await readHud();
  expect(initial.boss.visible).toBe(true);
  expect(initial.boss.title).toBe('Diken Ana');
  expect(initial.boss.phase).toContain('FAZ 1 / 3');
  expect(initial.boss.healthText).toContain('5200 / 5200');
  expect(initial.boss.hint).toContain('KÖK SÜTUNLARI');
  expect(initial.boss.barRatio).toBeCloseTo(1);
  await callBossArena(page,'browserTestDamageBoss',[1000]);
  const damaged=await readHud();
  expect(damaged.boss.health).toBeLessThan(initial.boss.health!);
  expect(damaged.boss.barRatio).toBeLessThan(initial.boss.barRatio);
  await callBossArena(page,'browserTestDamageBoss',[1500]);
  const phaseTwo=await readHud();
  expect(phaseTwo.boss.phase).toContain('FAZ 2 / 3');
  expect(phaseTwo.boss.phase).not.toBe(initial.boss.phase);
  expect(phaseTwo.boss.healthText).toContain('/');
  expect(errors).toEqual([]);
});


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
  expect(migrated.schemaVersion).toBe(11);
  expect(migrated.progression.soulEssence).toBe(88);
  expect(migrated.story.quests).toEqual({});
  expect(migrated.story.endingId).toBeNull();
  expect(migrated.story.completedEndingId).toBeNull();
  await page.reload();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.schemaVersion).toBe(11);
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
  const endingTexts = await page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { children: { list: { text?: unknown }[] } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Game bridge unavailable.');
    return game.scene.getScene('run').children.list.map(child => typeof child.text === 'string' ? child.text : '').filter(Boolean);
  });
  expect(endingTexts).toContain('PERDE ONARILDI');
  expect(endingTexts).toContain('SON KARARIN  •  PERDEYİ ONAR');
  expect(endingTexts.some(text => text.includes('Perde yeniden örüldü'))).toBe(true);
  expect(endingTexts).toContain('ANA MENÜ  •  NG+');
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.story.endingId).toBe('ending-mended-veil');
  expect(saved.story.completedEndingId).toBe('ending-mended-veil');

  // A duplicate finish callback must not persist the same run rewards twice.
  await page.evaluate(() => {
    const host = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => unknown } } }).__BEYOND_VEIL_GAME__;
    if (!host) throw new Error('Game bridge unavailable.');
    const scene = host.scene.getScene('run') as { finishRun: (won: boolean) => void };
    scene.finishRun(true);
  });
  const afterDuplicateFinish = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterDuplicateFinish.progression.soulEssence).toBe(saved.progression.soulEssence);
  expect(afterDuplicateFinish.progression.completedRuns).toBe(saved.progression.completedRuns);
  expect(afterDuplicateFinish.story.completedEndingId).toBe('ending-mended-veil');

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const reloaded = await page.evaluate(() => JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.story.completedEndingId).toBe('ending-mended-veil');
  expect(pageErrors).toEqual([]);
});

test('beyond-veil branch displays its distinct epilogue and New Game+ return path', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await startBrowserTestRun(page);

  await page.evaluate(() => {
    const host = (window as Window & { __BEYOND_VEIL_GAME__?: { registry: { get: (key: string) => unknown }; scene: { getScene: (key: string) => unknown } } }).__BEYOND_VEIL_GAME__;
    if (!host) throw new Error('Game bridge unavailable.');
    const manager = host.registry.get('saveManager') as { load: () => { data: any }; save: (value: any) => void };
    const save = manager.load().data;
    save.story.endingId = 'ending-beyond-veil';
    save.story.quests['castle-veil-heir'] = {
      status: 'completed',
      objectiveProgress: { 'decode-regent-seals': 3, 'face-veil-echoes': 3 },
      chosenChoiceId: 'tear-the-veil',
      outcomeId: 'veil-torn'
    };
    save.story.appliedOutcomeIds.push('veil-torn');
    save.story.unlockedPathIds.push('castle-beyond-gate');
    save.story.bossEncounterIds.push('unwritten-regent-unbound');
    manager.save(save);
    const scene = host.scene.getScene('run') as { questSaveData?: unknown };
    scene.questSaveData = save;
  });

  await page.evaluate(() => {
    const host = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { browserTestSpawnBossForRegion: (region: string, encounters?: string[]) => void; browserTestDamageBoss: (amount: number) => void } } } }).__BEYOND_VEIL_GAME__;
    if (!host) throw new Error('Game bridge unavailable.');
    const scene = host.scene.getScene('run');
    scene.browserTestSpawnBossForRegion('cursed-castle', ['unwritten-regent-unbound']);
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
  expect(saved.story.completedEndingId).toBe('ending-beyond-veil');
  const endingTexts = await page.evaluate(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (key: string) => { children: { list: { text?: unknown }[] } } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Game bridge unavailable.');
    return game.scene.getScene('run').children.list.map(child => typeof child.text === 'string' ? child.text : '').filter(Boolean);
  });
  expect(endingTexts).toContain('PERDENİN ÖTESİ');
  expect(endingTexts).toContain('SON KARARIN  •  PERDEYİ YIRT');
  expect(endingTexts.some(text => text.includes('Perde yırtıldı'))).toBe(true);
  expect(endingTexts).toContain('ANA MENÜ  •  NG+');
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
    const beforeMove=await readBrowserRunSnapshot(page);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(6_000);
    await page.keyboard.up('ArrowLeft');
    const afterMove=await readBrowserRunSnapshot(page);
    expect(afterMove.playerX).toBeLessThan(beforeMove.playerX-100);
    expect(afterMove.regionMap.playerWalkable).toBe(true);
  }
  expect(pageErrors).toEqual([]);
});

test('five hunter active abilities have distinct live Phaser combat effects',async({page})=>{
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const hunters=[
    {id:'cursed-hunter',effect:'radial-knockback'},
    {id:'black-knight',effect:'guard-and-stagger'},
    {id:'spirit-mage',effect:'delayed-spirit-zone'},
    {id:'shadow-assassin',effect:'blink-and-mark'},
    {id:'blood-priestess',effect:'health-sacrifice-lifesteal'}
  ];
  for(const hunter of hunters){
    await page.evaluate(id=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestRestartCharacter:(characterId:string)=>void}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      game.scene.getScene('run').browserTestRestartCharacter(id);
    },hunter.id);
    await expect.poll(async()=>(await readBrowserRunSnapshot(page)).ability.effect).toBe(hunter.effect);
    const probe=await page.evaluate(()=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestAbilityProbe:()=>{effect:string;beforeHealth:number;afterHealth:number;beforePlayerX:number;afterPlayerX:number;targetVelocity:number;targetHealthBefore:number;targetHealthAfter:number;guardActive:boolean;markedTargetCount:number;cooldownRemainingMs:number}}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('run').browserTestAbilityProbe();
    });
    expect(probe.effect).toBe(hunter.effect);
    expect(probe.cooldownRemainingMs).toBeGreaterThan(0);
    if(hunter.id==='cursed-hunter')expect(probe.targetVelocity).toBeGreaterThan(100);
    if(hunter.id==='black-knight')expect(probe.guardActive).toBe(true);
    if(hunter.id==='spirit-mage'){
      await expect.poll(async()=>(await readBrowserRunSnapshot(page)).ability.delayedZoneFired,{timeout:8_000}).toBe(true);
      const impact=await readBrowserRunSnapshot(page);
      expect(impact.ability.delayedZoneFired,JSON.stringify({ability:impact.ability,paused:impact.paused,runFinished:impact.runFinished})).toBe(true);
      expect(impact.ability.delayedZoneRunFinished).toBe(false);
      expect(impact.ability.delayedZoneCandidateCount).toBeGreaterThan(0);
      expect(impact.ability.delayedZoneInRangeCount).toBeGreaterThan(0);
      expect(impact.ability.delayedZoneDamage).toBeGreaterThan(0);
    }
    if(hunter.id==='shadow-assassin'){
      expect(Math.abs(probe.afterPlayerX-probe.beforePlayerX)).toBeGreaterThan(20);
      expect(probe.markedTargetCount).toBeGreaterThan(0);
    }
    if(hunter.id==='blood-priestess'){
      expect(probe.afterHealth).toBeGreaterThan(probe.beforeHealth-15);
      expect(probe.afterHealth).toBeGreaterThan(1);
    }
  }
  expect(pageErrors).toEqual([]);
});

test('dynamic day and regional weather cycles stay deterministic across all five regions',async({page})=>{
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  // Start away from the initial run's region so the first restart cannot pass on a stale region snapshot.
  const cases=[
    {id:'forgotten-graveyard',weather:['clear','dense-fog','drizzle']},
    {id:'cursed-forest',weather:['clear','rain','fog','storm']},
    {id:'deep-dungeon',weather:['dry','ashfall','steam']},
    {id:'rotten-swamp',weather:['rain','dense-fog','storm']},
    {id:'cursed-castle',weather:['fog','snow','storm','clear']}
  ];
  for(const item of cases){
    await page.evaluate(id=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestRestartRegion:(region:string)=>void}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      game.scene.getScene('run').browserTestRestartRegion(id);
    },item.id);
    await expect.poll(async()=>(await readBrowserRunSnapshot(page)).regionMap.regionId).toBe(item.id);
    await expect.poll(async()=>(await readBrowserRunSnapshot(page)).elapsedMs,{timeout:5_000}).toBeLessThan(1_000);
    for(let i=0;i<4;i++){
      const current=await readBrowserRunSnapshot(page);
      const target=i*240000+60_000;
      await page.evaluate(delta=>{
        const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skip?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
        if(!game)throw new Error('Development browser test bridge is not available.');
        game.scene.getScene('run').browserTestAdvanceElapsed(delta,true);
      },target-current.elapsedMs);
      const snapshot=await readBrowserRunSnapshot(page);
      expect(snapshot.environment.weather).toBe(item.weather[i%item.weather.length]);
      expect(snapshot.environment.timeOfDay).toBe(['dawn','day','sunset','night'][i]);
      expect(snapshot.environment.weatherLabel.length).toBeGreaterThan(0);
    }
  }
  expect(pageErrors).toEqual([]);
});



for (const challengeCase of [
  { id: 'limited-arsenal' as const, slots: 3, health: 1, speed: 1 },
  { id: 'glass-oath' as const, slots: 6, health: 0.6, speed: 1 },
  { id: 'hunters-nightmare' as const, slots: 6, health: 1, speed: 1.2 }
]) {
  test('Challenge mode applies '+challengeCase.id+' rules to live Phaser combat', async ({ page }) => {
    const pageErrors:string[]=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    await startBrowserTestRun(page,[],'challenge',challengeCase.id);
    const started=await readBrowserRunSnapshot(page);
    expect(started.gameMode).toBe('challenge');
    expect(started.challengeId).toBe(challengeCase.id);
    expect(started.bossSpawned).toBe(false);
    expect(started.waveSpawnIndex).toBeGreaterThan(0);
    expect(started.challengeModifiers.maxWeaponSlots).toBe(challengeCase.slots);
    expect(started.challengeModifiers.maxHealthMultiplier).toBe(challengeCase.health);
    expect(started.challengeModifiers.enemyMoveSpeedMultiplier).toBe(challengeCase.speed);

    const probe=await page.evaluate(()=>{
      const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestChallengeProbe:()=>{challengeId:string;maxWeaponSlots:number;maxHealthMultiplier:number;enemyMoveSpeedMultiplier:number;maxHealth:number;expectedMaxHealth:number;weaponSlotsUsed:number;weaponAddChoiceCount:number;enemySpeedRatio:number;bossSpeedRatio:number}}}}}).__BEYOND_VEIL_GAME__;
      if(!game)throw new Error('Development browser test bridge is not available.');
      return game.scene.getScene('run').browserTestChallengeProbe();
    });
    expect(probe.challengeId).toBe(challengeCase.id);
    expect(probe.maxHealth).toBe(probe.expectedMaxHealth);
    expect(probe.maxWeaponSlots).toBe(challengeCase.slots);
    expect(probe.weaponSlotsUsed).toBe(3);
    if(challengeCase.id==='limited-arsenal')expect(probe.weaponAddChoiceCount).toBe(0);
    else expect(probe.weaponAddChoiceCount).toBeGreaterThan(0);
    expect(probe.enemySpeedRatio).toBeCloseTo(challengeCase.speed,1);
    expect(probe.bossSpeedRatio).toBeCloseTo(challengeCase.speed,1);
    expect(pageErrors).toEqual([]);
  });
}


test('Endless mode keeps spawning, loops stronger regional bosses, rotates rules and pays survival milestones', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page,[],'endless');
  const beforeSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  const started=await readBrowserRunSnapshot(page);
  expect(started.gameMode).toBe('endless');
  expect(started.bossSpawned).toBe(false);
  expect(started.waveSpawnIndex).toBeGreaterThan(0);
  expect(started.endless.bossCyclesCompleted).toBe(0);
  expect(started.endless.nextBossAtMs).toBe(14*60*1000);

  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestAdvanceElapsed:(ms:number,skip?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestAdvanceElapsed(14*60*1000,true);
  });
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossSpawned).toBe(true);
  const firstBoss=await readBrowserRunSnapshot(page);
  expect(firstBoss.bossMaxHealth).toBeGreaterThan(0);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).waveSpawnIndex).toBeGreaterThan(started.waveSpawnIndex);

  await defeatBrowserTestBoss(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestAvailable).toBe(true);
  await moveToBrowserTestBossChest(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.collectOutcome,{timeout:5_000}).toBe('opened');
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels,{timeout:3_000}).toBeGreaterThan(0);
  let pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  while(pendingLevels>0){
    await page.locator('#game-container canvas').click({position:{x:520,y:382}});
    await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels).toBeLessThan(pendingLevels);
    pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  }
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).endless.bossCyclesCompleted,{timeout:5_000}).toBe(1);
  const betweenBosses=await readBrowserRunSnapshot(page);
  expect(betweenBosses.runFinished).toBe(false);
  expect(betweenBosses.bossSpawned).toBe(false);
  const remainingBossDelay=betweenBosses.endless.nextBossAtMs-betweenBosses.elapsedMs;
  expect(remainingBossDelay).toBeGreaterThanOrEqual(5*60*1000-1_000);
  expect(remainingBossDelay).toBeLessThanOrEqual(5*60*1000+1_000);

  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestClearEnemies:()=>void;browserTestAdvanceElapsed:(ms:number,skip?:boolean)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    const scene=game.scene.getScene('run');
    scene.browserTestClearEnemies();
    scene.browserTestAdvanceElapsed(5*60*1000,true);
  });
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossSpawned).toBe(true);
  const secondBoss=await readBrowserRunSnapshot(page);
  expect(secondBoss.endless.bossCyclesCompleted).toBe(1);
  expect(secondBoss.endless.ruleId).toBe('blood-tide');
  expect(secondBoss.endless.ruleModifiers.incomingDamageMultiplier).toBe(1.2);
  expect(secondBoss.bossMaxHealth).toBeGreaterThan(firstBoss.bossMaxHealth!);

  await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestFinishRun:()=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestFinishRun();
  });
  const finished=await readBrowserRunSnapshot(page);
  expect(finished.runFinished).toBe(true);
  expect(finished.lastRunSaved).toBe(true);
  const afterSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterSave.progression.soulEssence).toBe(beforeSave.progression.soulEssence+finished.runSoulEssence);
  expect(afterSave.progression.completedRuns).toBe(beforeSave.progression.completedRuns+1);
  expect(pageErrors).toEqual([]);
});

test('Boss Hunt starts the selected regional boss immediately and persists only chest rewards', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page,[],'boss-hunt');
  const beforeSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  const started=await readBrowserRunSnapshot(page);
  expect(started.gameMode).toBe('boss-hunt');
  expect(started.bossSpawned).toBe(true);
  expect(started.bossHealth).toBeGreaterThan(0);
  expect(started.waveSpawnIndex).toBe(0);
  expect(started.activeEnemyCount).toBe(1);
  expect(started.runEvents.active).toBeNull();
  expect(started.runEvents.completed).toEqual([]);
  expect(started.questProgress).toEqual({});
  expect(started.explorationLandmarks).toEqual([]);
  expect(started.availableStoryPathIds).toEqual([]);

  await page.waitForTimeout(1_800);
  const stillFocused=await readBrowserRunSnapshot(page);
  expect(stillFocused.waveSpawnIndex).toBe(0);
  expect(stillFocused.runEvents.active).toBeNull();
  expect(stillFocused.bossSpawned).toBe(true);

  await defeatBrowserTestBoss(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestAvailable).toBe(true);
  await moveToBrowserTestBossChest(page);
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).bossChestDiagnostics.collectOutcome,{timeout:5_000}).toBe('opened');
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels,{timeout:3_000}).toBeGreaterThan(0);
  let pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  while(pendingLevels>0){
    await page.locator('#game-container canvas').click({position:{x:520,y:382}});
    await expect.poll(async()=> (await readBrowserRunSnapshot(page)).queuedLevels).toBeLessThan(pendingLevels);
    pendingLevels=(await readBrowserRunSnapshot(page)).queuedLevels;
  }
  await expect.poll(async()=> (await readBrowserRunSnapshot(page)).lastRunSaved,{timeout:8_000}).toBe(true);
  const victory=await readBrowserRunSnapshot(page);
  expect(victory.lastRunSaved).toBe(true);
  expect(victory.runRelicIds).toContain('matriarch-seed');

  const afterSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterSave.progression.soulEssence).toBe(beforeSave.progression.soulEssence+180);
  expect(afterSave.progression.completedRuns).toBe(beforeSave.progression.completedRuns);
  expect(afterSave.progression.unlockedRegionIds).toEqual(beforeSave.progression.unlockedRegionIds);
  expect(afterSave.collections.relicIds).toContain('matriarch-seed');
  expect(afterSave.collections.characterMastery).toEqual(beforeSave.collections.characterMastery);
  expect(afterSave.collections.completedAchievementIds).toEqual(beforeSave.collections.completedAchievementIds);
  expect(afterSave.story).toEqual(beforeSave.story);
  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.progression.soulEssence).toBe(afterSave.progression.soulEssence);
  expect(reloaded.story).toEqual(beforeSave.story);
  expect(pageErrors).toEqual([]);
});

test('completed story objectives open a pausing branch choice and persist the selected outcome',async({page})=>{
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const initial=await readBrowserRunSnapshot(page);
  expect(initial.questProgress['forest-root-oath']?.status).toBe('active');
  expect(initial.questChoice).toBeNull();
  expect(initial.questTrackerText).toContain('Köklerin Yemini');
  const beforeSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));

  await page.evaluate(()=>{
    const game=(window as Window&{__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestCompleteQuestObjectives:(id:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestCompleteQuestObjectives('forest-root-oath');
  });
  const pending=await readBrowserRunSnapshot(page);
  expect(pending.paused).toBe(true);
  expect(pending.ability.sceneTimePaused).toBe(true);
  expect(pending.questChoice).toEqual({questId:'forest-root-oath',choiceIds:['spare-warden','claim-heartwood']});
  expect(pending.questChoiceTexts).toContain('LANETLİ ORMAN  •  ANA GÖREV');
  expect(pending.questChoiceTexts).toContain('Köklerin Yemini');
  expect(pending.questChoiceTexts).toContain('Bekçi yaşar; orman sakinleşir ve Diken Ana uyanmış biçimiyle karşına çıkar.');
  expect(pending.questChoiceTexts).toContain('Bekçi kaybolur; orman solar ve Diken Ana yozlaşmış biçimiyle karşına çıkar.');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await readBrowserRunSnapshot(page)).questChoice).toBeNull();
  const afterSave=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterSave.story.quests['forest-root-oath']).toMatchObject({status:'completed',chosenChoiceId:'claim-heartwood',outcomeId:'forest-claim'});
  expect(afterSave.story.npcFates['briar-warden']).toBe('vanished');
  expect(afterSave.story.regionAtmospheres['cursed-forest']).toBe('withered');
  expect(afterSave.story.unlockedPathIds).toContain('forest-heartwood-vault');
  expect(afterSave.story.bossEncounterIds).toContain('thorn-matriarch-corrupted');
  expect(afterSave.story.unlockedRewardIds).toContain('heartwood-sigil');
  expect(afterSave.progression.soulEssence).toBe(beforeSave.progression.soulEssence+65);
  expect((await readBrowserRunSnapshot(page)).paused).toBe(false);

  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.story.quests['forest-root-oath']).toMatchObject({status:'completed',chosenChoiceId:'claim-heartwood',outcomeId:'forest-claim'});
  expect(reloaded.story.unlockedPathIds).toContain('forest-heartwood-vault');
  expect(pageErrors).toEqual([]);
});


test('story choice mercy branch persists its authored world outcome',async({page})=>{
  const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  await page.evaluate(()=>{
    const game=(window as Window&{__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestCompleteQuestObjectives:(id:string)=>void}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    game.scene.getScene('run').browserTestCompleteQuestObjectives('forest-root-oath');
  });
  await expect.poll(async()=>(await readBrowserRunSnapshot(page)).questChoice).not.toBeNull();
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await readBrowserRunSnapshot(page)).questChoice).toBeNull();
  const saved=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(saved.story.quests['forest-root-oath']).toMatchObject({status:'completed',chosenChoiceId:'spare-warden',outcomeId:'forest-mercy'});
  expect(saved.story.npcFates['briar-warden']).toBe('spared');
  expect(saved.story.regionAtmospheres['cursed-forest']).toBe('quiet-growth');
  expect(saved.story.bossEncounterIds).toContain('thorn-matriarch-awakened');
  expect(saved.story.unlockedPathIds).toContain('forest-mercy-path');
  expect(saved.story.unlockedRewardIds).toContain('root-warden-token');
  expect(saved.progression.soulEssence).toBeGreaterThanOrEqual(40);
  await page.reload();
  await expect(page.locator('#game-container canvas')).toBeVisible();
  const reloaded=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(reloaded.story.quests['forest-root-oath']).toMatchObject({chosenChoiceId:'spare-warden',outcomeId:'forest-mercy'});
  expect(reloaded.story.npcFates['briar-warden']).toBe('spared');
  expect(pageErrors).toEqual([]);
});

test('quest journal reads saved branches, regional state and ending history from the main menu', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();

  await page.evaluate(() => {
    const key = 'beyond-the-veil.save';
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error('First-launch save was not created.');
    const save = JSON.parse(raw);
    save.progression.unlockedRegionIds = ['cursed-forest', 'forgotten-graveyard'];
    save.progression.completedEndingIds = ['ending-mended-veil'];
    save.story.quests = {
      'forest-root-oath': {
        status: 'active',
        objectiveProgress: { 'inspect-root-runes': 1 },
        chosenChoiceId: null,
        outcomeId: null
      },
      'grave-names-unforgotten': {
        status: 'completed',
        objectiveProgress: { 'recover-grave-names': 3, 'break-soul-chains': 2 },
        chosenChoiceId: 'release-spirits',
        outcomeId: 'grave-release'
      }
    };
    save.story.npcFates = { 'mourner-acolyte': 'redeemed' };
    save.story.regionAtmospheres = { 'forgotten-graveyard': 'restful' };
    save.story.unlockedPathIds = ['grave-silent-gate'];
    save.story.bossEncounterIds = ['ossuary-king-reckoning'];
    save.story.unlockedRewardIds = ['namesake-charm'];
    save.story.unlockedAlternateQuestIds = ['grave-lost-lament'];
    save.story.appliedOutcomeIds = ['grave-release'];
    save.collections.discoveredLoreIds = ['forgotten-graveyard-lore'];
    window.localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await expect(canvas).toBeVisible();
  await page.mouse.click(1110, 60);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean; isPaused: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('quest-journal') && game.scene.isPaused('main-menu'));
  });

  const forest = await readQuestJournalSnapshot(page);
  expect(forest.selectedRegionId).toBe('cursed-forest');
  const activeForestQuest = forest.selected.quests.find(quest => quest.id === 'forest-root-oath');
  expect(activeForestQuest?.status).toBe('active');
  expect(activeForestQuest?.objectiveProgress.find(objective => objective.id === 'inspect-root-runes')).toMatchObject({
    current: 1,
    target: 2
  });
  expect(forest.completedEndingIds).toEqual(['ending-mended-veil']);

  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await readQuestJournalSnapshot(page)).selectedRegionId).toBe('forgotten-graveyard');
  const graveyard = await readQuestJournalSnapshot(page);
  expect(graveyard.selected.quests.find(quest => quest.id === 'grave-names-unforgotten')).toMatchObject({
    status: 'completed',
    chosenChoiceLabel: 'Ruhları serbest bırak',
    outcomeSummary: 'Ruhlar özgür kalır; mezarlık huzura kavuşur ve Kemik Kralın hesaplaşma yolu belirlenir.'
  });
  expect(graveyard.selected.npcFateLabel).toBe('RUHLARLA BİRLİKTE ARINDI');
  expect(graveyard.selected.atmosphereName).toBe('Huzurlu Mezarlık');
  expect(graveyard.selected.bossVariantName).toBeTruthy();
  expect(graveyard.selected.unlockedPathNames).toContain('Sessiz Ruh Kapısı');
  expect(graveyard.selected.discoveredLoreIds).toContain('forgotten-graveyard-lore');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean; isPaused: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('main-menu') && !game.scene.isActive('quest-journal') && !game.scene.isPaused('main-menu'));
  });
  expect(pageErrors).toEqual([]);
});

test('quest journal opens above the paused run and returns to the pause menu without resuming gameplay', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const canvas = await startBrowserTestRun(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).paused).toBe(true);

  await page.mouse.click(640, 446);
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean; isPaused: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('quest-journal') && game.scene.isActive('run'));
  });
  const opened = await readQuestJournalSnapshot(page);
  expect(opened.returnScene).toBe('run');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean; isPaused: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run') && !game.scene.isActive('quest-journal'));
  });
  expect((await readBrowserRunSnapshot(page)).paused).toBe(true);
  const paused = await readBrowserRunSnapshot(page);
  await page.waitForTimeout(300);
  expect((await readBrowserRunSnapshot(page)).elapsedMs).toBe(paused.elapsedMs);

  await page.mouse.click(640, 346);
  await expect.poll(async () => (await readBrowserRunSnapshot(page)).paused).toBe(false);
  expect(await canvas.isVisible()).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('New Game+ unlocks after an ending, confirms the reset, and scales live enemies and bosses', async ({ page }) => {
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/?bv-test=1');
  const canvas=page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await page.evaluate(()=>{
    const key='beyond-the-veil.save';
    const raw=window.localStorage.getItem(key);
    if(!raw)throw new Error('Initial profile was not created.');
    const save=JSON.parse(raw) as {story:{completedEndingId:string|null};progression:{soulEssence:number;newGamePlusLevel:number;completedEndingIds:string[];unlockedRegionIds:string[];completedRuns:number}};
    save.story.completedEndingId='ending-mended-veil';
    save.progression.soulEssence=432;
    save.progression.newGamePlusLevel=0;
    save.progression.completedEndingIds=[];
    save.progression.unlockedRegionIds=['cursed-forest','forgotten-graveyard'];
    window.localStorage.setItem(key,JSON.stringify(save));
  });
  await page.reload();
  await expect(canvas).toBeVisible();
  const before=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  await page.mouse.click(760,555);
  await page.keyboard.press('Escape');
  const cancelled=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(cancelled.progression.newGamePlusLevel).toBe(0);
  expect(cancelled.progression.unlockedRegionIds).toContain('forgotten-graveyard');

  await page.mouse.click(760,555);
  await page.mouse.click(495,485);
  await page.waitForFunction(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('character-select'));
  });
  const afterStart=await page.evaluate(()=>JSON.parse(window.localStorage.getItem('beyond-the-veil.save')!));
  expect(afterStart.schemaVersion).toBe(11);
  expect(afterStart.progression.newGamePlusLevel).toBe(1);
  expect(afterStart.progression.completedEndingIds).toEqual(['ending-mended-veil']);
  expect(afterStart.progression.unlockedRegionIds).toEqual(['cursed-forest']);
  expect(afterStart.progression.soulEssence).toBe(432);
  expect(afterStart.story.completedEndingId).toBeNull();
  expect(afterStart.story.quests).toEqual({});
  expect(afterStart.progression.completedRuns).toBe(before.progression.completedRuns);

  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('region-select'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run-preparation'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{isActive:(key:string)=>boolean}}}).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive('run'));
  });
  const snapshot=await readBrowserRunSnapshot(page);
  expect(snapshot.newGamePlusLevel).toBe(1);
  expect(snapshot.newGamePlusModifiers.enemyHealthMultiplier).toBeCloseTo(1.1);
  expect(snapshot.newGamePlusModifiers.bossHealthMultiplier).toBeCloseTo(1.15);
  const probe=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestNewGamePlusProbe:()=>{level:number;enemy:{health:number;maxHealth:number;speed:number;contactDamage:number;attackDamage:number};boss:{health:number;maxHealth:number;contactDamage:number;attackDamage:number;movementMultiplier:number}}}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Game bridge unavailable.');
    return game.scene.getScene('run').browserTestNewGamePlusProbe();
  });
  expect(probe.level).toBe(1);
  expect(probe.enemy.health).toBe(37);
  expect(probe.enemy.speed).toBeCloseTo(63.24);
  expect(probe.enemy.contactDamage).toBeCloseTo(8.4);
  expect(probe.enemy.attackDamage).toBeCloseTo(8.4);
  expect(probe.boss.health).toBe(5980);
  expect(probe.boss.contactDamage).toBeCloseTo(23.54);
  expect(probe.boss.attackDamage).toBeCloseTo(19.26);
  expect(probe.boss.movementMultiplier).toBeCloseTo(1.03);
  expect(pageErrors).toEqual([]);
});


test('adaptive enemies respond to elemental, area and precision builds without hard counters',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const result=await page.evaluate(()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestEnemyAdaptationProbe:()=>{
      areaLateralRatio:number;precisionLateralRatio:number;elementShieldActive:boolean;
      elementShieldDamageRatio:number;elementMarkerVisible:boolean;eliteExcluded:boolean;summonExcluded:boolean;
    }}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene('run').browserTestEnemyAdaptationProbe();
  });
  expect(result.areaLateralRatio).toBeGreaterThan(.15);
  expect(result.precisionLateralRatio).toBeGreaterThan(.15);
  expect(result.elementShieldActive).toBe(true);
  expect(result.elementShieldDamageRatio).toBeCloseTo(.85,1);
  expect(result.elementMarkerVisible).toBe(true);
  expect(result.eliteExcluded).toBe(true);
  expect(result.summonExcluded).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('six seeded enemy mutations execute their live Phaser combat effects and readable markers',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await startBrowserTestRun(page);
  const results=await page.evaluate(async()=>{
    const game=(window as Window & {__BEYOND_VEIL_GAME__?:{scene:{getScene:(key:string)=>{browserTestEnemyMutationProbe:(id:string)=>Promise<{
      mutationId:string;label:string;markerVisible:boolean;armoredDamageRatio:number;moveSpeedRatio:number;
      poisonStacks:number;vampiricHealing:number;curseActive:boolean;explosionDamage:number
    }>}}}}).__BEYOND_VEIL_GAME__;
    if(!game)throw new Error('Development browser test bridge is not available.');
    const scene=game.scene.getScene('run');
    const ids=['poisonous','explosive','armored','fast','vampiric','cursed'];
    const snapshots=[];
    for(const id of ids)snapshots.push(await scene.browserTestEnemyMutationProbe(id));
    return snapshots;
  });
  expect(results.map(item=>item.mutationId)).toEqual(['poisonous','explosive','armored','fast','vampiric','cursed']);
  expect(results.every(item=>item.markerVisible&&item.label.length>0)).toBe(true);
  expect(results.find(item=>item.mutationId==='poisonous')?.poisonStacks).toBe(1);
  expect(results.find(item=>item.mutationId==='explosive')?.explosionDamage).toBeGreaterThan(0);
  const armor=results.find(item=>item.mutationId==='armored')!.armoredDamageRatio;
  expect(armor).toBeGreaterThan(.6);
  expect(armor).toBeLessThan(.85);
  expect(results.find(item=>item.mutationId==='fast')?.moveSpeedRatio).toBeCloseTo(1.3,1);
  expect(results.find(item=>item.mutationId==='vampiric')?.vampiricHealing).toBeGreaterThan(0);
  expect(results.find(item=>item.mutationId==='cursed')?.curseActive).toBe(true);
  expect(pageErrors).toEqual([]);
});



test('responsive shell fits landscape viewports and guides portrait mobile orientation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('#orientation-hint')).toBeVisible();
  const portraitBox = await canvas.boundingBox();
  expect(portraitBox).not.toBeNull();
  expect(portraitBox!.width).toBeLessThanOrEqual(390);
  expect(portraitBox!.height).toBeLessThanOrEqual(844);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#orientation-hint')).toBeHidden();
  const landscapeBox = await canvas.boundingBox();
  expect(landscapeBox).not.toBeNull();
  expect(landscapeBox!.width).toBeLessThanOrEqual(844);
  expect(landscapeBox!.height).toBeLessThanOrEqual(390);
});


test('smart TV remote keys navigate menu, journal, hunter and region screens', async ({ page }) => {
  await page.goto('/?bv-test=1');
  await page.locator('#game-container canvas').waitFor();

  const sendRemoteKey = async (key: string): Promise<void> => {
    await page.evaluate((remoteKey) => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: remoteKey,
        code: remoteKey,
        bubbles: true,
        cancelable: true
      }));
    }, key);
  };
  const isActive = (scene: string) => page.evaluate((sceneKey) => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (key: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive(sceneKey));
  }, scene);

  await sendRemoteKey('ColorF2Yellow');
  await expect.poll(() => isActive('quest-journal')).toBe(true);
  await sendRemoteKey('BrowserBack');
  await expect.poll(() => isActive('main-menu')).toBe(true);

  await sendRemoteKey('OK');
  await expect.poll(() => isActive('character-select')).toBe(true);
  await sendRemoteKey('ColorF1Green');
  await expect.poll(() => isActive('region-select')).toBe(true);
  await sendRemoteKey('ColorF0Red');
  await expect.poll(() => isActive('character-select')).toBe(true);
  await sendRemoteKey('ColorF0Red');
  await expect.poll(() => isActive('main-menu')).toBe(true);
});


test('touch-first hunter, region and run-preparation layouts keep large selection targets and preserve choices', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem('beyond-the-veil.save', JSON.stringify({
      schemaVersion: 11,
      profile: { createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
      progression: {
        soulEssence: 0, completedRuns: 0, newGamePlusLevel: 0, completedEndingIds: [],
        unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'],
        completedDifficulties: {}, permanentUpgrades: {}, equippedRelicIds: [],
        equipmentProfiles: {
          'cursed-hunter': [{
            id: 'touch-profile-1', characterId: 'cursed-hunter', name: 'Dokunmatik Profil',
            startingWeaponId: 'gravecleaver', startingPassiveId: 'storm-conductor',
            relicIds: ['forest-heart']
          }]
        },
        activeEquipmentProfileIds: {}
      },
      collections: {
        characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: ['forest-heart'],
        craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [],
        achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [],
        achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [],
        discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
      },
      story: {
        quests: {}, npcFates: {}, regionAtmospheres: {}, unlockedPathIds: [], bossEncounterIds: [],
        unlockedRewardIds: [], unlockedAlternateQuestIds: [], endingId: null, completedEndingId: null,
        appliedOutcomeIds: []
      },
      settings: {}
    }));
  });

  await page.goto('/?bv-test=1');
  const canvas = page.locator('#game-container canvas');
  await expect(canvas).toBeVisible();
  const tapLogical = async (x: number, y: number): Promise<void> => {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Game canvas has no visible bounds.');
    await page.touchscreen.tap(bounds.x + bounds.width * x / 1280, bounds.y + bounds.height * y / 720);
  };
  const isActive = (key: string) => page.evaluate(sceneKey => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { isActive: (scene: string) => boolean } } }).__BEYOND_VEIL_GAME__;
    return Boolean(game?.scene.isActive(sceneKey));
  }, key);
  const snapshot = (key: string) => page.evaluate(sceneKey => {
    const game = (window as Window & { __BEYOND_VEIL_GAME__?: { scene: { getScene: (scene: string) => { browserTestSnapshot: () => Record<string, unknown> } } } }).__BEYOND_VEIL_GAME__;
    if (!game) throw new Error('Development browser test bridge is not available.');
    return game.scene.getScene(sceneKey).browserTestSnapshot();
  }, key);

  await tapLogical(160, 555);
  await expect.poll(() => isActive('character-select')).toBe(true);
  const firstHunter = await snapshot('character-select') as { selectedIndex: number; characterId: string; layoutMode: string };
  expect(firstHunter.layoutMode).toBe('touch');
  await tapLogical(1138, 354);
  await expect.poll(async () => (await snapshot('character-select')).selectedIndex).toBe(1);
  const secondHunter = await snapshot('character-select') as { selectedIndex: number; characterId: string; layoutMode: string };
  expect(secondHunter.characterId).not.toBe(firstHunter.characterId);

  await tapLogical(1102, 660);
  await expect.poll(() => isActive('region-select')).toBe(true);
  const firstRegion = await snapshot('region-select') as { selectedIndex: number; regionId: string; layoutMode: string };
  expect(firstRegion.layoutMode).toBe('touch');
  await tapLogical(1138, 255);
  await expect.poll(async () => (await snapshot('region-select')).selectedIndex).toBe(1);
  await tapLogical(142, 255);
  await expect.poll(async () => (await snapshot('region-select')).selectedIndex).toBe(0);
  await tapLogical(1102, 660);
  await expect.poll(() => isActive('run-preparation')).toBe(true);

  const initialLoadout = await snapshot('run-preparation') as { selectedProfileId: string | null; layoutMode: string; profileCount: number };
  expect(initialLoadout.layoutMode).toBe('touch');
  expect(initialLoadout.profileCount).toBe(1);
  expect(initialLoadout.selectedProfileId).toBeNull();
  await tapLogical(1202, 350);
  await expect.poll(async () => (await snapshot('run-preparation')).selectedProfileId).toBe('touch-profile-1');

  await tapLogical(1102, 660);
  await expect.poll(() => isActive('run')).toBe(true);
  const run = await readBrowserRunSnapshot(page);
  expect(run.weapons[0]?.weaponId).toBe('gravecleaver');
  expect(run.passives[0]?.passiveId).toBe('storm-conductor');
  expect(run.equippedRelicIds).toEqual(['forest-heart']);
  expect(pageErrors).toEqual([]);
  await context.close();
});
