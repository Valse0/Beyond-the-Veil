import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBossHuntResult, applyRunResult } from '../.test-dist/src/gameplay/run/run-results.js';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';

test('death preserves earned Ruh Özü and increments completed runs without unlocking a region', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  save.progression.soulEssence = 25;
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: 17 });
  assert.equal(result.progression.soulEssence, 42);
  assert.equal(result.progression.completedRuns, 1);
  assert.deepEqual(result.progression.unlockedRegionIds, ['cursed-forest']);
  assert.equal(save.progression.soulEssence, 25);
});

test('boss victory persists earned essence and unlocks only the next region', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: true, soulEssenceEarned: 180 });
  assert.equal(result.progression.soulEssence, 180);
  assert.equal(result.progression.completedRuns, 1);
  assert.deepEqual(result.progression.unlockedRegionIds, ['cursed-forest', 'forgotten-graveyard']);
});

test('victory in the final region does not invent another unlock', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  save.progression.unlockedRegionIds.push('forgotten-graveyard', 'deep-dungeon', 'rotten-swamp', 'cursed-castle');
  const result = applyRunResult(save, { regionId: 'cursed-castle', won: true, soulEssenceEarned: 400 });
  assert.equal(result.progression.unlockedRegionIds.length, 5);
  assert.equal(result.progression.soulEssence, 400);
});

test('negative and non-finite rewards cannot reduce or inflate currency', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  assert.equal(applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: -100 }).progression.soulEssence, 0);
  assert.equal(applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: Number.NaN }).progression.soulEssence, 0);
});


test('boss chest relic rewards are added to the permanent relic collection on victory', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  const result = applyRunResult(save, {
    regionId: 'cursed-forest',
    won: true,
    soulEssenceEarned: 180,
    relicIdsEarned: ['matriarch-seed', 'matriarch-seed', 'unknown-relic'],
    bossChestOpened: true
  });
  assert.deepEqual(result.collections.relicIds, ['matriarch-seed']);
  assert.deepEqual(result.progression.equippedRelicIds, []);
  assert.deepEqual(save.collections.relicIds, []);
});


test('treasure-hunt materials persist after the run and ignore unknown or invalid material counts', () => {
  const save = createInitialSaveData('2026-11-18T12:00:00.000Z');
  const result = applyRunResult(save, {
    regionId: 'cursed-forest',
    won: false,
    soulEssenceEarned: 0,
    craftingMaterialsEarned: { 'living-root': 1, 'unknown-material': 4, 'ossuary-dust': -2, 'furnace-ingot': 1.5 }
  });
  assert.deepEqual(result.collections.craftingMaterials, { 'living-root': 1 });
  assert.deepEqual(save.collections.craftingMaterials, {});
});


test('character mastery persists on defeat, awards kill bonuses, and unlocks milestones cumulatively', () => {
  const save = createInitialSaveData('2026-11-19T12:00:00.000Z');
  const first = applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 20 });
  assert.equal(first.collections.characterMastery['cursed-hunter'], 5);
  assert.deepEqual(first.collections.unlockedMasteryRewardIds, []);
  const second = applyRunResult(first, { regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 90 });
  assert.equal(second.collections.characterMastery['cursed-hunter'], 27);
  assert.deepEqual(second.collections.unlockedMasteryRewardIds, ['hunter-title']);
  assert.deepEqual(second.collections.unlockedCosmeticIds, ['ashen-hunter', 'forest-wraith', 'bone-regalia']);
  assert.equal(save.collections.characterMastery['cursed-hunter'], undefined);
});

test('mastery grants the boss victory bonus and unlocks level-five and level-ten rewards', () => {
  const save = createInitialSaveData('2026-11-19T12:00:00.000Z');
  save.collections.characterMastery['black-knight'] = 99;
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: 'black-knight', kills: 0 });
  assert.equal(result.collections.characterMastery['black-knight'], 112);
  assert.deepEqual(result.collections.unlockedMasteryRewardIds, ['knight-title', 'aegis-alt']);
  assert.deepEqual(result.collections.unlockedCosmeticIds, ['ashen-hunter', 'bone-regalia']);
  const final = applyRunResult({ ...result, collections: { ...result.collections, characterMastery: { ...result.collections.characterMastery, 'black-knight': 249 } } }, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'black-knight', kills: 0
  });
  assert.equal(final.collections.characterMastery['black-knight'], 252);
  assert.deepEqual(final.collections.unlockedMasteryRewardIds, ['knight-title', 'aegis-alt', 'iron-oath-skin']);
  assert.deepEqual(final.collections.unlockedCosmeticIds, ['ashen-hunter', 'bone-regalia', 'iron-oath-skin']);
});

test('run results grant achievements and keep rewards after defeat', () => {
  const save = createInitialSaveData('2026-11-19T12:00:00.000Z');
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 100, explorationEventsCompleted: 3 });
  assert.ok(result.collections.completedAchievementIds.includes('first-descent'));
  assert.ok(result.collections.completedAchievementIds.includes('first-blood'));
  assert.ok(result.collections.completedAchievementIds.includes('curious-soul'));
  assert.ok(result.collections.unlockedCosmeticIds.includes('ashen-hunter'));
  assert.ok(result.collections.unlockedCosmeticIds.includes('forest-wraith'));
  assert.ok(!result.collections.relicIds.includes('forest-heart'));
});

test('run discoveries persist on defeat while region story lore requires a victory input', () => {
  const save = createInitialSaveData();
  const defeated = applyRunResult(save, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 1,
    enemyIdsEarned: ['rootbound-husk'], weaponIdsEarned: ['veil-bolt']
  });
  assert.deepEqual(defeated.collections.discoveredEnemyIds, ['rootbound-husk']);
  assert.deepEqual(defeated.collections.discoveredWeaponIds, ['veil-bolt']);
  assert.deepEqual(defeated.collections.discoveredCharacterBioIds, ['cursed-hunter']);
  assert.deepEqual(defeated.collections.discoveredLoreIds, []);
  const victory = applyRunResult(defeated, {
    regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: 'cursed-hunter',
    loreIdsEarned: ['cursed-forest-lore']
  });
  assert.deepEqual(victory.collections.discoveredLoreIds, ['cursed-forest-lore']);
});


test('boss relics require an opened boss chest and a matching region victory', () => {
  const save = createInitialSaveData();
  const base = { regionId: 'cursed-forest', soulEssenceEarned: 0, relicIdsEarned: ['matriarch-seed'] };
  const noChest = applyRunResult(save, { ...base, won: true });
  const defeat = applyRunResult(save, { ...base, won: false, bossChestOpened: true });
  const wrongRegion = applyRunResult(save, { ...base, regionId: 'forgotten-graveyard', won: true, bossChestOpened: true });
  assert.deepEqual(noChest.collections.relicIds, []);
  assert.deepEqual(defeat.collections.relicIds, []);
  assert.deepEqual(wrongRegion.collections.relicIds, []);
  const opened = applyRunResult(save, { ...base, won: true, bossChestOpened: true });
  assert.deepEqual(opened.collections.relicIds, ['matriarch-seed']);
});

test('exploration relics require successful treasure-hunt completion and survive later defeat', () => {
  const save = createInitialSaveData();
  const base = { regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, relicIdsEarned: ['forest-heart'] };
  const incomplete = applyRunResult(save, base);
  assert.deepEqual(incomplete.collections.relicIds, []);
  const failed = applyRunResult(save, { ...base, completedTreasureHunt: false });
  assert.deepEqual(failed.collections.relicIds, []);
  const completed = applyRunResult(save, { ...base, completedTreasureHunt: true });
  assert.deepEqual(completed.collections.relicIds, ['forest-heart']);
  const duplicate = applyRunResult(completed, { ...base, completedTreasureHunt: true });
  assert.deepEqual(duplicate.collections.relicIds, ['forest-heart']);
});

test('relic acquisition rejects cross-region and wrong-source IDs even with completion flags', () => {
  const save = createInitialSaveData();
  const result = applyRunResult(save, {
    regionId: 'cursed-forest', won: true, soulEssenceEarned: 0,
    relicIdsEarned: ['matriarch-seed', 'forest-heart', 'king-crown-shard'],
    bossChestOpened: true, completedTreasureHunt: true
  });
  assert.deepEqual(result.collections.relicIds, ['matriarch-seed', 'forest-heart']);
});


test('lore and secret-path discoveries persist on defeat and are idempotent', () => {
  const save = createInitialSaveData();
  const discovered = applyRunResult(save, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0,
    loreIdsEarned: ['cursed-forest-lore'],
    discoveredPathIdsEarned: ['cursed-forest-secret']
  });
  assert.deepEqual(discovered.collections.discoveredLoreIds, ['cursed-forest-lore']);
  assert.deepEqual(discovered.story.unlockedPathIds, ['cursed-forest-secret']);
  const repeated = applyRunResult(discovered, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0,
    loreIdsEarned: ['cursed-forest-lore', 'cursed-forest-lore'],
    discoveredPathIdsEarned: ['cursed-forest-secret', 'cursed-forest-secret']
  });
  assert.deepEqual(repeated.collections.discoveredLoreIds, ['cursed-forest-lore']);
  assert.deepEqual(repeated.story.unlockedPathIds, ['cursed-forest-secret']);
  assert.deepEqual(save.collections.discoveredLoreIds, []);
  assert.deepEqual(save.story.unlockedPathIds, []);
});

test('secret-path discovery rejects IDs belonging to another region or unknown paths', () => {
  const save = createInitialSaveData();
  const result = applyRunResult(save, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0,
    discoveredPathIdsEarned: ['forgotten-graveyard-secret', 'made-up-secret']
  });
  assert.deepEqual(result.story.unlockedPathIds, []);
});


test('Boss Hunt victory persists only the opened boss chest relic and boss essence', () => {
  const save = createInitialSaveData('2026-11-20T12:00:00.000Z');
  save.progression.soulEssence = 40;
  const beforeStory = structuredClone(save.story);
  const beforeMastery = structuredClone(save.collections.characterMastery);
  const beforeAchievements = [...save.collections.completedAchievementIds];
  const result = applyBossHuntResult(save, {
    regionId: 'cursed-forest',
    won: true,
    bossChestOpened: true,
    soulEssenceEarned: 180,
    relicIdsEarned: ['matriarch-seed', 'matriarch-seed', 'forest-heart', 'king-crown-shard', 'unknown-relic']
  });
  assert.equal(result.progression.soulEssence, 220);
  assert.equal(result.progression.completedRuns, save.progression.completedRuns);
  assert.deepEqual(result.progression.unlockedRegionIds, save.progression.unlockedRegionIds);
  assert.deepEqual(result.collections.relicIds, ['matriarch-seed']);
  assert.deepEqual(result.collections.characterMastery, beforeMastery);
  assert.deepEqual(result.collections.completedAchievementIds, beforeAchievements);
  assert.deepEqual(result.story, beforeStory);
  assert.equal(save.progression.soulEssence, 40);
});

test('Boss Hunt defeat or unopened chest grants no permanent reward or campaign progress', () => {
  const save = createInitialSaveData('2026-11-20T12:00:00.000Z');
  const base = { regionId: 'cursed-forest', soulEssenceEarned: 180, relicIdsEarned: ['matriarch-seed'] };
  const results = [
    applyBossHuntResult(save, { ...base, won: false, bossChestOpened: true }),
    applyBossHuntResult(save, { ...base, won: true, bossChestOpened: false }),
    applyBossHuntResult(save, { ...base, won: true })
  ];
  for (const result of results) {
    assert.equal(result.progression.soulEssence, save.progression.soulEssence);
    assert.equal(result.progression.completedRuns, save.progression.completedRuns);
    assert.deepEqual(result.progression.unlockedRegionIds, save.progression.unlockedRegionIds);
    assert.deepEqual(result.collections.relicIds, save.collections.relicIds);
    assert.deepEqual(result.story, save.story);
  }
});
