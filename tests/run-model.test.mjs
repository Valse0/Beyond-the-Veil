import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunState, gainExperience, applyUpgrade, receiveDamage, advanceRun } from '../.test-dist/src/gameplay/run/run-model.js';
import { calculateDamage, findNearestTarget } from '../.test-dist/src/gameplay/combat/combat-rules.js';

test('new run has a valid baseline', () => {
  const s = createRunState(); assert.equal(s.level, 1); assert.equal(s.health, 100); assert.equal(s.experience, 0);
});
test('XP overflow is preserved across multiple level-ups', () => {
  const r = gainExperience(createRunState(), 40); assert.equal(r.levelsGained, 3); assert.equal(r.state.level, 4); assert.ok(r.state.experience >= 0);
});
test('each upgrade changes its intended stat', () => {
  const s = createRunState(); assert.equal(applyUpgrade(s, 'power').damage, 24);
  assert.equal(applyUpgrade(s, 'haste').attackIntervalMs, 635); assert.equal(applyUpgrade(s, 'vitality').maxHealth, 120);
  assert.equal(applyUpgrade(s, 'magnet').magnetRadius, 177);
});
test('damage clamps at zero and elapsed time cannot move backwards', () => {
  assert.equal(receiveDamage(createRunState(), 500).health, 0); assert.equal(advanceRun(createRunState(), -100).elapsedMs, 0);
});
test('nearest target and damage are deterministic', () => {
  const targets = [{ x: 9, y: 0, id: 'far' }, { x: 2, y: 0, id: 'near' }];
  assert.equal(findNearestTarget({ x: 0, y: 0 }, targets)?.id, 'near'); assert.equal(calculateDamage(12, 1.5), 18);
});
