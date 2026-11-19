import { CRAFTING_MATERIALS, CRAFTING_RECIPES } from '../../data/crafting.js';
import { WEAPONS } from '../../data/weapons.js';

export const MAX_CRAFTING_MATERIALS = 99;
const MATERIAL_IDS = new Set(CRAFTING_MATERIALS.map(item => item.id));
const RECIPES = new Map(CRAFTING_RECIPES.map(recipe => [recipe.id, recipe]));
const VARIANT_IDS = new Set(WEAPONS.flatMap(weapon => weapon.branches.flatMap(branch => branch.variant ? [branch.variant.id] : [])));

export interface CraftingInventory {
  soulEssence: number;
  materials: Record<string, number>;
  unlockedWeaponVariantIds: string[];
}

export function grantCraftingMaterials(
  current: Readonly<Record<string, number>>,
  earned: Readonly<Record<string, number>>
): Record<string, number> {
  const next = { ...current };
  for (const [id, amount] of Object.entries(earned)) {
    if (!MATERIAL_IDS.has(id) || !Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) continue;
    next[id] = Math.min(MAX_CRAFTING_MATERIALS, (next[id] ?? 0) + amount);
  }
  return next;
}

export function craftRecipe(inventory: CraftingInventory, recipeId: string): CraftingInventory | null {
  const recipe = RECIPES.get(recipeId);
  if (!recipe || !VARIANT_IDS.has(recipe.unlockWeaponVariantId)) return null;
  if (inventory.unlockedWeaponVariantIds.includes(recipe.unlockWeaponVariantId)) return null;
  if (!Number.isFinite(inventory.soulEssence) || inventory.soulEssence < recipe.soulEssenceCost) return null;
  for (const [materialId, amount] of Object.entries(recipe.materialCosts)) {
    if (!MATERIAL_IDS.has(materialId) || !Number.isInteger(amount) || amount <= 0 || (inventory.materials[materialId] ?? 0) < amount) return null;
  }
  const materials = { ...inventory.materials };
  for (const [materialId, amount] of Object.entries(recipe.materialCosts)) {
    materials[materialId] = (materials[materialId] ?? 0) - amount;
    if (materials[materialId] === 0) delete materials[materialId];
  }
  return {
    soulEssence: inventory.soulEssence - recipe.soulEssenceCost,
    materials,
    unlockedWeaponVariantIds: [...inventory.unlockedWeaponVariantIds, recipe.unlockWeaponVariantId]
  };
}

export function isCraftingMaterialId(id: string): boolean {
  return MATERIAL_IDS.has(id);
}

export function isWeaponVariantId(id: string): boolean {
  return VARIANT_IDS.has(id);
}
