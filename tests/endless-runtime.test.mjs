import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../.test-dist/src/data/bosses.js';
import {
  ENDLESS_FIRST_BOSS_AT_MS,
  ENDLESS_BOSS_INTERVAL_MS,
  createEndlessRuntimeState,
  getEndlessRule,
  getEndlessRuleModifiers,
  shouldSpawnEndlessBoss,
  completeEndlessBossCycle,
  scaleEndlessBoss,
  getEndlessSurvivalReward
} from '../.test-dist/src/gameplay/run/endless-runtime.js';

test('Endless begins with the existing 14-minute regional boss schedule', () => {
  const state = createEndlessRuntimeState();
  assert.equal(state.bossCyclesCompleted, 0);
  assert.equal(state.nextBossAtMs, ENDLESS_FIRST_BOSS_AT_MS);
  assert.equal(shouldSpawnEndlessBoss(state, ENDLESS_FIRST_BOSS_AT_MS - 1, false, false), false);
  assert.equal(shouldSpawnEndlessBoss(state, ENDLESS_FIRST_BOSS_AT_MS, false, false), true);
  assert.equal(shouldSpawnEndlessBoss(state, ENDLESS_FIRST_BOSS_AT_MS, true, false), false);
  assert.equal(shouldSpawnEndlessBoss(state, ENDLESS_FIRST_BOSS_AT_MS, false, true), false);
});

test('Opening a boss chest schedules the next regional boss five minutes later', () => {
  const first = completeEndlessBossCycle(createEndlessRuntimeState(), ENDLESS_FIRST_BOSS_AT_MS + 30_000);
  assert.equal(first.bossCyclesCompleted, 1);
  assert.equal(first.nextBossAtMs, ENDLESS_FIRST_BOSS_AT_MS + 30_000 + ENDLESS_BOSS_INTERVAL_MS);
  const second = completeEndlessBossCycle(first, first.nextBossAtMs + 45_000);
  assert.equal(second.bossCyclesCompleted, 2);
  assert.equal(second.nextBossAtMs, first.nextBossAtMs + 45_000 + ENDLESS_BOSS_INTERVAL_MS);
});

test('Endless rules rotate every three minutes after minute fifteen', () => {
  assert.equal(getEndlessRule(ENDLESS_FIRST_BOSS_AT_MS), null);
  assert.equal(getEndlessRule(15 * 60_000)?.id, 'hunters-moon');
  assert.equal(getEndlessRule(18 * 60_000)?.id, 'blood-tide');
  assert.equal(getEndlessRule(21 * 60_000)?.id, 'iron-veil');
  assert.equal(getEndlessRule(24 * 60_000)?.id, 'hunters-moon');
  assert.deepEqual(getEndlessRuleModifiers(15 * 60_000), {
    enemyHealthMultiplier: 1, enemyMoveSpeedMultiplier: 1.18,
    incomingDamageMultiplier: 1, experienceMultiplier: 1
  });
  assert.equal(getEndlessRuleModifiers(21 * 60_000).enemyHealthMultiplier, 1.25);
  assert.equal(getEndlessRuleModifiers(21 * 60_000).experienceMultiplier, 1.25);
});

test('Endless boss cycles increase health, contact damage, attack damage and movement', () => {
  const base = BOSSES[0];
  const first = scaleEndlessBoss(base, 0);
  const second = scaleEndlessBoss(base, 1);
  const third = scaleEndlessBoss(base, 2);
  assert.equal(first.health, base.health);
  assert.equal(first.contactDamage, base.contactDamage);
  assert.equal(second.health, Math.round(base.health * 1.2));
  assert.equal(second.contactDamage, base.contactDamage * 1.08);
  assert.equal(second.phases[0].attacks[0].damage, base.phases[0].attacks[0].damage * 1.08);
  assert.equal(second.phases[0].movementMultiplier, (base.phases[0].movementMultiplier ?? 1) * 1.04);
  assert.ok(third.health > second.health);
  assert.equal(scaleEndlessBoss(base, 100).health, Math.round(base.health * 3));
});

test('Endless survival rewards use completed five-minute milestones and opened boss cycles', () => {
  assert.equal(getEndlessSurvivalReward(4 * 60_000, 0), 0);
  assert.equal(getEndlessSurvivalReward(5 * 60_000 - 1, 0), 0);
  assert.equal(getEndlessSurvivalReward(15 * 60_000, 0), 75);
  assert.equal(getEndlessSurvivalReward(15 * 60_000, 2), 225);
  assert.equal(getEndlessSurvivalReward(Number.NaN, -2), 0);
});
