import test from 'node:test';
import assert from 'node:assert/strict';
import { CRAFTING_MATERIALS, CRAFTING_RECIPES } from '../.test-dist/src/data/crafting.js';
import { grantCraftingMaterials, craftRecipe, MAX_CRAFTING_MATERIALS } from '../.test-dist/src/gameplay/crafting/crafting-runtime.js';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { weaponLevelStats } from '../.test-dist/src/gameplay/weapons/build-runtime.js';

test('five regional materials and five recipes have unique IDs and matching regions', () => {
  assert.equal(CRAFTING_MATERIALS.length, 5);
  assert.equal(CRAFTING_RECIPES.length, 5);
  assert.equal(new Set(CRAFTING_MATERIALS.map(item => item.id)).size, 5);
  assert.equal(new Set(CRAFTING_RECIPES.map(item => item.id)).size, 5);
  for (const recipe of CRAFTING_RECIPES) {
    const materialId = Object.keys(recipe.materialCosts)[0];
    const material = CRAFTING_MATERIALS.find(item => item.id === materialId);
    const weapon = WEAPONS.find(item => item.id === recipe.weaponId);
    const variant = weapon?.branches.find(branch => branch.variant?.id === recipe.unlockWeaponVariantId)?.variant;
    assert.ok(material);
    assert.equal(material.regionId, recipe.regionId);
    assert.ok(weapon);
    assert.ok(variant);
    assert.equal(recipe.materialCosts[materialId], 2);
    assert.ok(recipe.soulEssenceCost > 0);
  }
});

test('material rewards accept only known positive integers and cap each stack', () => {
  const result = grantCraftingMaterials(
    { 'living-root': 98 },
    { 'living-root': 5, 'unknown-material': 3, 'ossuary-dust': -1, 'furnace-ingot': 1.5 }
  );
  assert.deepEqual(result, { 'living-root': MAX_CRAFTING_MATERIALS });
});

test('crafting consumes exact resources and unlocks a permanent weapon variant', () => {
  const inventory = { soulEssence: 300, materials: { 'living-root': 3 }, unlockedWeaponVariantIds: [] };
  const result = craftRecipe(inventory, 'recipe-verdant-spread');
  assert.deepEqual(result, {
    soulEssence: 160,
    materials: { 'living-root': 1 },
    unlockedWeaponVariantIds: ['briar-seed-verdant-variant']
  });
  assert.deepEqual(inventory, { soulEssence: 300, materials: { 'living-root': 3 }, unlockedWeaponVariantIds: [] });
  assert.equal(craftRecipe(result, 'recipe-verdant-spread'), null);
});

test('crafting rejects unknown recipes and insufficient resources without mutating the inventory', () => {
  const inventory = { soulEssence: 100, materials: { 'living-root': 1 }, unlockedWeaponVariantIds: [] };
  assert.equal(craftRecipe(inventory, 'not-a-recipe'), null);
  assert.equal(craftRecipe(inventory, 'recipe-verdant-spread'), null);
  assert.deepEqual(inventory, { soulEssence: 100, materials: { 'living-root': 1 }, unlockedWeaponVariantIds: [] });
});

test('crafted weapon variants modify only the matching branch after permanent unlock', () => {
  const weapon = WEAPONS.find(item => item.id === 'briar-seed');
  assert.ok(weapon);
  const spread = weapon.branches.find(item => item.id === 'briar-seed-branch-spread');
  assert.ok(spread?.variant);
  const progress = { weaponId: weapon.id, level: 3, branchId: spread.id, evolved: false };
  const base = weaponLevelStats(progress, weapon);
  const crafted = weaponLevelStats(progress, weapon, [spread.variant.id]);
  assert.ok(crafted.damage > base.damage);
  assert.ok(crafted.areaMultiplier > base.areaMultiplier);
  assert.equal(crafted.variantName, spread.variant.name);
});
