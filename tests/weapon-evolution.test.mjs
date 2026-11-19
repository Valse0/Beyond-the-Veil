import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { PASSIVES } from '../.test-dist/src/data/passives.js';
import { addPassive, addWeapon, chooseWeaponBranch, EMPTY_BUILD, evolveWeapon, upgradePassive, upgradeWeapon, weaponLevelStats } from '../.test-dist/src/gameplay/weapons/build-runtime.js';

function makeEligibleBuild(weapon = WEAPONS[0], branchId) {
  const passive = PASSIVES.find(item => item.id === weapon.evolution.requiredPassiveId);
  assert.ok(passive, 'the weapon evolution passive must exist in the catalog');
  let build = addWeapon(EMPTY_BUILD, weapon);
  build = addPassive(build, passive);
  for (let level = 1; level < 3; level += 1) build = upgradeWeapon(build, weapon);
  if (branchId) build = chooseWeaponBranch(build, weapon, branchId);
  for (let level = 3; level < weapon.maxLevel; level += 1) build = upgradeWeapon(build, weapon);
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


test('all twelve weapons define two distinct, executable branch evolutions', () => {
  assert.equal(WEAPONS.length, 12);
  const supportedBehaviors = new Set([
    'homing-projectile','cleaving-arc','piercing-thrust','chain-lightning','orbiting-blades','area-seed',
    'spirit-seeker','life-tether','fan-volley','defensive-pulse','delayed-mortar','delayed-sigil'
  ]);
  for (const weapon of WEAPONS) {
    assert.equal(weapon.branches.length, 2, weapon.id);
    assert.equal(weapon.evolution.branchPaths.length, 2, weapon.id);
    assert.ok(PASSIVES.some(passive => passive.id === weapon.evolution.requiredPassiveId), weapon.id);
    const branchIds = new Set(weapon.branches.map(branch => branch.id));
    const pathBranchIds = new Set(weapon.evolution.branchPaths.map(path => path.branchId));
    assert.deepEqual(pathBranchIds, branchIds, weapon.id);
    assert.equal(new Set(weapon.evolution.branchPaths.map(path => path.id)).size, 2, weapon.id);
    assert.equal(new Set(weapon.evolution.branchPaths.map(path => path.name)).size, 2, weapon.id);
    assert.notEqual(weapon.evolution.branchPaths[0].behaviorChange, weapon.evolution.branchPaths[1].behaviorChange, weapon.id);
    for (const path of weapon.evolution.branchPaths) {
      assert.ok(path.id && path.name && path.description, weapon.id);
      assert.ok(supportedBehaviors.has(path.behaviorChange), weapon.id + '/' + path.id);
    }
    assert.ok(supportedBehaviors.has(weapon.evolution.defaultBehavior), weapon.id);
  }
});

test('every selected branch remains attached to its weapon and selects its authored evolution in runtime stats', () => {
  for (const weapon of WEAPONS) {
    for (const path of weapon.evolution.branchPaths) {
      const { build } = makeEligibleBuild(weapon, path.branchId);
      const evolved = evolveWeapon(build, weapon);
      const progress = evolved.weapons.find(item => item.weaponId === weapon.id);
      assert.equal(progress.evolved, true, weapon.id + '/' + path.branchId);
      assert.equal(progress.branchId, path.branchId, weapon.id + '/' + path.branchId);
      const stats = weaponLevelStats(progress, weapon);
      assert.equal(stats.behavior, path.behaviorChange, weapon.id + '/' + path.branchId);
      assert.equal(stats.evolutionName, path.name, weapon.id + '/' + path.branchId);
      assert.equal(stats.evolutionId, path.id, weapon.id + '/' + path.branchId);
    }
  }
});

test('a weapon without a chosen branch keeps its existing default evolution', () => {
  for (const weapon of WEAPONS) {
    const { build } = makeEligibleBuild(weapon);
    const evolved = evolveWeapon(build, weapon);
    const progress = evolved.weapons.find(item => item.weaponId === weapon.id);
    const stats = weaponLevelStats(progress, weapon);
    assert.equal(progress.evolved, true, weapon.id);
    assert.equal(progress.branchId, undefined, weapon.id);
    assert.equal(stats.behavior, weapon.evolution.defaultBehavior, weapon.id);
    assert.equal(stats.evolutionName, weapon.evolution.name, weapon.id);
  }
});

test('an invalid saved branch cannot evolve into the default or another branch path', () => {
  const weapon = WEAPONS[0];
  const { build } = makeEligibleBuild(weapon);
  const invalid = { ...build, weapons: build.weapons.map(item => ({ ...item, branchId: 'unknown-branch' })) };
  assert.equal(evolveWeapon(invalid, weapon).weapons[0].evolved, false);
});

test('evolution still requires the maximum weapon level and level-five required passive for every weapon', () => {
  for (const weapon of WEAPONS) {
    const { build, passive } = makeEligibleBuild(weapon, weapon.branches[0].id);
    const lowWeapon = { ...build, weapons: build.weapons.map(item => ({ ...item, level: weapon.maxLevel - 1 })) };
    const lowPassive = { ...build, passives: build.passives.map(item => ({ ...item, level: 4 })) };
    assert.equal(evolveWeapon(lowWeapon, weapon).weapons[0].evolved, false, weapon.id + '/weapon');
    assert.equal(evolveWeapon(lowPassive, weapon).weapons[0].evolved, false, weapon.id + '/passive');
    assert.equal(passive.id, weapon.evolution.requiredPassiveId);
  }
});
