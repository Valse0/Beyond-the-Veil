import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../.test-dist/src/data/characters.js';
import {
  CHARACTER_MASTERY_THRESHOLDS,
  applyCharacterMastery,
  calculateRunMasteryPoints,
  getCharacterMasteryLevel
} from '../.test-dist/src/gameplay/progression/character-mastery.js';

test('all five hunters define mastery rewards at levels 2, 5 and 10', () => {
  assert.equal(CHARACTERS.length, 5);
  for (const character of CHARACTERS) assert.deepEqual(character.mastery.map(item => item.level), [2, 5, 10]);
  assert.deepEqual(CHARACTER_MASTERY_THRESHOLDS.map(item => item.points), [25, 100, 250]);
});

test('run mastery points have a baseline, ten-kill bonus and boss victory bonus', () => {
  assert.equal(calculateRunMasteryPoints(0, false), 3);
  assert.equal(calculateRunMasteryPoints(29, false), 5);
  assert.equal(calculateRunMasteryPoints(29, true), 15);
  assert.equal(calculateRunMasteryPoints(-5, false), 3);
  assert.equal(calculateRunMasteryPoints(Number.NaN, false), 3);
});

test('mastery level maps accumulated points to authored levels', () => {
  assert.equal(getCharacterMasteryLevel(0), 1);
  assert.equal(getCharacterMasteryLevel(25), 2);
  assert.equal(getCharacterMasteryLevel(99), 2);
  assert.equal(getCharacterMasteryLevel(100), 5);
  assert.equal(getCharacterMasteryLevel(250), 10);
});

test('milestone rewards unlock once and level-ten cosmetic reward enters the cosmetic collection', () => {
  const initial = { characterMastery: {}, unlockedMasteryRewardIds: [], unlockedCosmeticIds: [] };
  const first = applyCharacterMastery(initial, 'cursed-hunter', 25);
  assert.equal(first.characterMastery['cursed-hunter'], 25);
  assert.deepEqual(first.unlockedMasteryRewardIds, ['hunter-title']);
  assert.deepEqual(first.unlockedCosmeticIds, []);

  const second = applyCharacterMastery(first, 'cursed-hunter', 225);
  assert.equal(second.characterMastery['cursed-hunter'], 250);
  assert.deepEqual(second.unlockedMasteryRewardIds, ['hunter-title', 'pulse-alt', 'ashen-trail']);
  assert.deepEqual(second.unlockedCosmeticIds, ['ashen-trail']);
  assert.deepEqual(initial, { characterMastery: {}, unlockedMasteryRewardIds: [], unlockedCosmeticIds: [] });
});

test('unknown hunters and invalid mastery awards cannot mutate profile collections', () => {
  const initial = { characterMastery: {}, unlockedMasteryRewardIds: [], unlockedCosmeticIds: [] };
  assert.equal(applyCharacterMastery(initial, 'unknown-hunter', 10), initial);
  assert.equal(applyCharacterMastery(initial, 'cursed-hunter', -1), initial);
  assert.equal(applyCharacterMastery(initial, 'cursed-hunter', 1.5), initial);
});
