import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings, readGameSettings, updateGameSettings } from '../.test-dist/src/gameplay/settings/settings-runtime.js';

test('settings normalize defaults and reject invalid stored values', () => {
  assert.deepEqual(normalizeGameSettings({ screenShake: false, touchControlScale: 9 }), { ...DEFAULT_GAME_SETTINGS, screenShake: false });
});
test('settings update preserves progression, story and unrelated settings', () => {
  const initial = createInitialSaveData('2026-11-20T00:00:00.000Z');
  const seeded = { ...initial, settings: { language: 'tr', customFlag: true } };
  const next = updateGameSettings(seeded, { screenFlash: false, damageNumbers: true });
  assert.equal(next.progression.soulEssence, 0);
  assert.deepEqual(next.story, seeded.story);
  assert.equal(next.settings.language, 'tr');
  assert.deepEqual(readGameSettings(next), { ...DEFAULT_GAME_SETTINGS, screenFlash: false, damageNumbers: true });
});
test('touch size accepts only supported steps and settings survive save serialization', () => {
  const initial = createInitialSaveData();
  const next = updateGameSettings(initial, { touchControlScale: 1.15, touchControlsVisible: false });
  const loaded = JSON.parse(JSON.stringify(next));
  assert.equal(readGameSettings(loaded).touchControlScale, 1.15);
  assert.equal(readGameSettings(loaded).touchControlsVisible, false);
});
