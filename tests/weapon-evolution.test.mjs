import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { PASSIVES } from '../.test-dist/src/data/passives.js';
import { addPassive, addWeapon, EMPTY_BUILD, evolveWeapon, upgradePassive, upgradeWeapon } from '../.test-dist/src/gameplay/weapons/build-runtime.js';

function makeEligibleBuild() {
  const weapon = WEAPONS[0];
  const passive = PASSIVES.find(item => item.id === weapon.evolution.requiredPassiveId);
  assert.ok(passive, 'the weapon evolution passive must exist in the catalog');
  let build = addWeapon(EMPTY_BUILD, weapon);
  build = addPassive(build, passive);
  for (let level = 1; level < weapon.maxLevel; level += 1) build = upgradeWeapon(build, weapon);
  for (let level = 1; level < passive.maxLevel; level += 1) build = upgradePassive(build, passive);
  return { build, weapon, passive };
}

test('boss chest evolution requires both a max-level weapon and its level-five passive', () => {
  const { build, weapon, passive } = makeEligibleBuild();
  const withoutWeaponMax = { ...build, weapons: build.weapons.map(item => ({ ...item, level: weapon.maxLevel - 1 })) };
  const withoutPassiveRequirement = { ...build, passives: build.passives.map(item => ({ ...item, level: passive.maxLevel - 1 })) };

  assert.equal(evolveWeapon(withoutWeaponMax, weapon).weapons[0].evolved, false);
  assert.equal(evolveWeapon(withoutPassiveRequirement, weapon).weapons[0].evolved, false);
});

test('boss chest evolves only eligible weapons and preserves unrelated build entries', () => {
  const { build, weapon } = makeEligibleBuild();
  const evolved = evolveWeapon(build, weapon);

  assert.equal(evolved.weapons[0].evolved, true);
  assert.equal(evolved.weapons[0].level, weapon.maxLevel);
  assert.deepEqual(evolved.passives, build.passives);
  assert.equal(build.weapons[0].evolved, false, 'evolution must not mutate the original build');
});

test('reopening an already evolved weapon is idempotent', () => {
  const { build, weapon } = makeEligibleBuild();
  const once = evolveWeapon(build, weapon);
  const twice = evolveWeapon(once, weapon);

  assert.deepEqual(twice, once);
});
