import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRunResult } from '../.test-dist/src/gameplay/run/run-results.js';
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
    relicIdsEarned: ['matriarch-seed', 'matriarch-seed', 'unknown-relic']
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
  assert.deepEqual(second.collections.unlockedCosmeticIds, ['ashen-hunter']);
  assert.equal(save.collections.characterMastery['cursed-hunter'], undefined);
});

test('mastery grants the boss victory bonus and unlocks level-five and level-ten rewards', () => {
  const save = createInitialSaveData('2026-11-19T12:00:00.000Z');
  save.collections.characterMastery['black-knight'] = 99;
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: 'black-knight', kills: 0 });
  assert.equal(result.collections.characterMastery['black-knight'], 112);
  assert.deepEqual(result.collections.unlockedMasteryRewardIds, ['knight-title', 'aegis-alt']);
  assert.deepEqual(result.collections.unlockedCosmeticIds, ['ashen-hunter']);
  const final = applyRunResult({ ...result, collections: { ...result.collections, characterMastery: { ...result.collections.characterMastery, 'black-knight': 249 } } }, {
    regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'black-knight', kills: 0
  });
  assert.equal(final.collections.characterMastery['black-knight'], 252);
  assert.deepEqual(final.collections.unlockedMasteryRewardIds, ['knight-title', 'aegis-alt', 'iron-oath-skin']);
  assert.deepEqual(final.collections.unlockedCosmeticIds, ['ashen-hunter', 'iron-oath-skin']);
});

test('run results grant achievements and keep rewards after defeat', () => {
  const save = createInitialSaveData('2026-11-19T12:00:00.000Z');
  const result = applyRunResult(save, { regionId: 'cursed-forest', won: false, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 100, explorationEventsCompleted: 3 });
  assert.ok(result.collections.completedAchievementIds.includes('first-descent'));
  assert.ok(result.collections.completedAchievementIds.includes('first-blood'));
  assert.ok(result.collections.completedAchievementIds.includes('curious-soul'));
  assert.ok(result.collections.unlockedCosmeticIds.includes('ashen-hunter'));
  assert.ok(result.collections.relicIds.includes('forest-heart'));
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
