import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { addWeapon, chooseWeaponBranch, EMPTY_BUILD, upgradeWeapon, weaponLevelStats } from '../.test-dist/src/gameplay/weapons/build-runtime.js';

function makeLevelThreeBuild(weapon) {
  let build = addWeapon(EMPTY_BUILD, weapon);
  build = upgradeWeapon(build, weapon);
  build = upgradeWeapon(build, weapon);
  return build;
}

test('all twelve weapons expose exactly two valid executable development branches', () => {
  assert.equal(WEAPONS.length, 12);
  for (const weapon of WEAPONS) {
    assert.equal(weapon.branches.length, 2, weapon.id);
    assert.equal(new Set(weapon.branches.map(branch => branch.id)).size, 2, weapon.id);
    for (const branch of weapon.branches) {
      const modifiers = branch.modifiers;
      assert.ok(branch.id.length > 0 && branch.name.length > 0 && branch.effect.length > 0);
      assert.ok(modifiers.damageMultiplier > 0);
      assert.ok(modifiers.intervalMultiplier > 0);
      assert.ok(modifiers.rangeMultiplier > 0);
      assert.ok(Number.isInteger(modifiers.projectileBonus) && modifiers.projectileBonus >= 0);
      assert.ok(Number.isInteger(modifiers.pierceBonus) && modifiers.pierceBonus >= 0);
      assert.ok(modifiers.areaMultiplier > 0);
      assert.ok(Number.isInteger(modifiers.chainTargetBonus) && modifiers.chainTargetBonus >= 0);
    }
  }
});

test('weapon branch cannot be selected before level three or without owning the weapon', () => {
  const weapon = WEAPONS[0];
  const levelOne = addWeapon(EMPTY_BUILD, weapon);
  assert.deepEqual(chooseWeaponBranch(levelOne, weapon, weapon.branches[0].id), levelOne);
  assert.deepEqual(chooseWeaponBranch(EMPTY_BUILD, weapon, weapon.branches[0].id), EMPTY_BUILD);
});

test('selecting a branch is immutable, one-time, and stores the exact branch id', () => {
  const weapon = WEAPONS[0];
  const levelThree = makeLevelThreeBuild(weapon);
  const selected = chooseWeaponBranch(levelThree, weapon, weapon.branches[0].id);

  assert.equal(selected.weapons[0].branchId, weapon.branches[0].id);
  assert.equal(levelThree.weapons[0].branchId, undefined);
  assert.deepEqual(chooseWeaponBranch(selected, weapon, weapon.branches[1].id), selected);
});

test('invalid branch ids leave the build unchanged', () => {
  const weapon = WEAPONS[0];
  const levelThree = makeLevelThreeBuild(weapon);
  assert.deepEqual(chooseWeaponBranch(levelThree, weapon, 'not-a-real-branch'), levelThree);
});

test('Focus changes damage, attack cadence, range and piercing in real weapon stats', () => {
  const weapon = WEAPONS[0];
  const levelThree = makeLevelThreeBuild(weapon);
  const selected = chooseWeaponBranch(levelThree, weapon, weapon.branches[0].id);
  const base = weaponLevelStats(levelThree.weapons[0], weapon);
  const focused = weaponLevelStats(selected.weapons[0], weapon);

  assert.ok(focused.damage > base.damage);
  assert.ok(focused.intervalMs < base.intervalMs);
  assert.ok(focused.range > base.range);
  assert.ok(focused.pierce > base.pierce);
  assert.equal(focused.projectiles, base.projectiles);
});

test('Spread increases projectile, area and chain-target capacity without reducing base damage', () => {
  const weapon = WEAPONS[0];
  const levelThree = makeLevelThreeBuild(weapon);
  const selected = chooseWeaponBranch(levelThree, weapon, weapon.branches[1].id);
  const base = weaponLevelStats(levelThree.weapons[0], weapon);
  const spread = weaponLevelStats(selected.weapons[0], weapon);

  assert.equal(spread.damage, base.damage);
  assert.equal(spread.projectiles, base.projectiles + 1);
  assert.ok(spread.range > base.range);
  assert.ok(spread.areaMultiplier > base.areaMultiplier);
  assert.equal(spread.chainTargetBonus, base.chainTargetBonus + 1);
});

test('unbranched weapon stats remain unchanged and branch modifiers do not mutate catalog data', () => {
  const weapon = WEAPONS[0];
  const levelThree = makeLevelThreeBuild(weapon);
  const before = structuredClone(weapon);
  const stats = weaponLevelStats(levelThree.weapons[0], weapon);

  assert.equal(stats.damage, weapon.levels[2].damage);
  assert.equal(stats.projectiles, weapon.levels[2].projectiles);
  assert.deepEqual(weapon, before);
});
