import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_MODE_RULES, getGameModeRules, resolveGameMode } from '../.test-dist/src/gameplay/run/game-mode-runtime.js';

test('unknown and missing game modes safely default to the existing Survival rules', () => {
  assert.equal(resolveGameMode(undefined), 'survival');
  assert.equal(resolveGameMode('not-a-mode'), 'survival');
  assert.equal(resolveGameMode('survival'), 'survival');
  assert.deepEqual(getGameModeRules('survival'), GAME_MODE_RULES.survival);
  assert.equal(GAME_MODE_RULES.survival.regularWavesEnabled, true);
  assert.equal(GAME_MODE_RULES.survival.timedEventsEnabled, true);
  assert.equal(GAME_MODE_RULES.survival.storyQuestsEnabled, true);
  assert.equal(GAME_MODE_RULES.survival.survivalTimeLimitEnabled, true);
});

test('Boss Hunt starts its boss immediately without Survival waves, events, quests or timer limit', () => {
  assert.equal(resolveGameMode('boss-hunt'), 'boss-hunt');
  const rules = getGameModeRules('boss-hunt');
  assert.equal(rules.startsBossImmediately, true);
  assert.equal(rules.regularWavesEnabled, false);
  assert.equal(rules.timedEventsEnabled, false);
  assert.equal(rules.storyQuestsEnabled, false);
  assert.equal(rules.explorationEnabled, false);
  assert.equal(rules.survivalTimeLimitEnabled, false);
  assert.equal(rules.fullRunProgressionEnabled, false);
});
