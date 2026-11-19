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
