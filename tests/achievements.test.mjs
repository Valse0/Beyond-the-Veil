import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAchievementRunProgress } from '../.test-dist/src/gameplay/progression/achievements.js';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { applyRunResult } from '../.test-dist/src/gameplay/run/run-results.js';

test('run achievements grant catalogued rewards to the correct collections', () => {
  const collections = applyAchievementRunProgress(createInitialSaveData().collections, {
    kills: 100, won: true, characterId: 'cursed-hunter', regionId: 'cursed-forest', explorationEventsCompleted: 3
  });
  assert.deepEqual(collections.completedAchievementIds, ['first-descent', 'first-blood', 'boss-slayer', 'curious-soul']);
  assert.ok(collections.unlockedCosmeticIds.includes('ashen-hunter'));
  assert.ok(collections.relicIds.includes('forest-heart'));
  assert.ok(collections.relicIds.includes('king-crown-shard'));
  assert.ok(collections.relicIds.includes('grave-lament'));
  assert.equal(collections.achievementProgress['total-kills'], 100);
});

test('achievement progress accumulates and completed rewards cannot be granted twice', () => {
  let collections = createInitialSaveData().collections;
  const run = { kills: 50, won: false, characterId: 'cursed-hunter', regionId: 'cursed-forest', explorationEventsCompleted: 1 };
  collections = applyAchievementRunProgress(collections, run);
  collections = applyAchievementRunProgress(collections, run);
  assert.deepEqual(collections.completedAchievementIds, ['first-descent', 'first-blood']);
  assert.equal(collections.achievementProgress['runs-completed'], 2);
  assert.equal(collections.achievementProgress['total-kills'], 100);
  assert.equal(collections.unlockedCosmeticIds.filter(id => id === 'ashen-hunter').length, 1);
  assert.equal(collections.relicIds.filter(id => id === 'forest-heart').length, 1);
});

test('run results track distinct hunters, regions, boss victories and exploration events', () => {
  let save = createInitialSaveData();
  for (const [characterId, regionId] of [
    ['cursed-hunter', 'cursed-forest'], ['black-knight', 'forgotten-graveyard'],
    ['spirit-mage', 'deep-dungeon'], ['shadow-assassin', 'rotten-swamp'], ['blood-priestess', 'cursed-castle']
  ]) {
    save = applyRunResult(save, { regionId, won: true, soulEssenceEarned: 0, characterId, kills: 0, explorationEventsCompleted: 2 });
  }
  assert.equal(save.collections.achievementProgress['boss-victories'], 5);
  assert.equal(save.collections.achievementProgress['exploration-events'], 10);
  assert.equal(save.collections.achievementProgress['unique-characters'], 5);
  assert.equal(save.collections.achievementProgress['unique-regions'], 5);
  assert.ok(save.collections.completedAchievementIds.includes('all-hunters'));
  assert.ok(save.collections.completedAchievementIds.includes('veil-walker'));
  assert.ok(save.collections.completedAchievementIds.includes('boss-hunter'));
  assert.ok(save.collections.completedAchievementIds.includes('pathfinder'));
  assert.equal(save.collections.achievementPlayedCharacterIds.length, 5);
  assert.equal(save.collections.achievementExploredRegionIds.length, 5);
});
