import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePermanentUpgradeEffects, getPermanentUpgradeCost } from '../.test-dist/src/gameplay/progression/permanent-upgrades.js';

test('derives capped permanent stat effects from saved levels', () => {
  const effects = derivePermanentUpgradeEffects({
    maxHealth: 5, attackPower: 2, moveSpeed: 3, armor: 4, xpBonus: 5, rerolls: 3
  });
  assert.deepEqual(effects, {
    maxHealthBonus: 75,
    damageMultiplier: 1.1,
    moveSpeedMultiplier: 1.12,
    armorBonus: 8,
    xpGainMultiplier: 1.4,
    extraRerolls: 3
  });
});

test('clamps malformed and over-cap levels to safe values', () => {
  const effects = derivePermanentUpgradeEffects({
    maxHealth: -2, attackPower: 99, moveSpeed: 1.5, armor: Number.NaN, xpBonus: '5', rerolls: 2
  });
  assert.equal(effects.maxHealthBonus, 0);
  assert.equal(effects.damageMultiplier, 1.25);
  assert.equal(effects.moveSpeedMultiplier, 1.04);
  assert.equal(effects.armorBonus, 0);
  assert.equal(effects.xpGainMultiplier, 1);
  assert.equal(effects.extraRerolls, 2);
});

test('permanent upgrade prices increase linearly and unknown ids have no price', () => {
  assert.equal(getPermanentUpgradeCost('maxHealth', 0), 50);
  assert.equal(getPermanentUpgradeCost('maxHealth', 2), 150);
  assert.equal(getPermanentUpgradeCost('rerolls', 1), 200);
  assert.equal(getPermanentUpgradeCost('unknown', 0), null);
});
