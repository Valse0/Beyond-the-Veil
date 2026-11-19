import type { CraftingMaterialDefinition, CraftingRecipeDefinition } from '../core/types/content.js';

export const CRAFTING_MATERIALS: readonly CraftingMaterialDefinition[] = [
  { id: 'living-root', name: 'Canlı Kök', regionId: 'cursed-forest', description: 'Hazine avı sandıklarında bulunan, hâlâ özsu taşıyan kök parçası.' },
  { id: 'ossuary-dust', name: 'Kemik Tozu', regionId: 'forgotten-graveyard', description: 'Unutulmuş mezarların mühürlü kalıntılarından toplanır.' },
  { id: 'furnace-ingot', name: 'Ocak Külçesi', regionId: 'deep-dungeon', description: 'Derin Zindan mekanizmalarının içinde kalan dövülebilir metal.' },
  { id: 'bog-crystal', name: 'Bataklık Kristali', regionId: 'rotten-swamp', description: 'Zehirli suyun dibinde oluşan yoğunlaşmış element kristali.' },
  { id: 'veil-thread', name: 'Perde İpliği', regionId: 'cursed-castle', description: 'Kalenin yarıklarından çıkarılan, gerçekliği tutan lif.' }
] as const;

export const CRAFTING_RECIPES: readonly CraftingRecipeDefinition[] = [
  { id: 'recipe-verdant-spread', name: 'Yeşil Veba', description: 'Diken Tohumu için güçlendirilmiş Yayılım varyantını açar.', regionId: 'cursed-forest', materialCosts: { 'living-root': 2 }, soulEssenceCost: 140, unlockWeaponVariantId: 'briar-seed-verdant-variant', weaponId: 'briar-seed' },
  { id: 'recipe-ossuary-storm', name: 'Kemik Kasırgası', description: 'Mezar Yarıcı için güçlendirilmiş Yayılım varyantını açar.', regionId: 'forgotten-graveyard', materialCosts: { 'ossuary-dust': 2 }, soulEssenceCost: 140, unlockWeaponVariantId: 'gravecleaver-ossuary-variant', weaponId: 'gravecleaver' },
  { id: 'recipe-forge-cataclysm', name: 'Ocak Felaketi', description: 'Rün Havanı için güçlendirilmiş Yayılım varyantını açar.', regionId: 'deep-dungeon', materialCosts: { 'furnace-ingot': 2 }, soulEssenceCost: 160, unlockWeaponVariantId: 'rune-mortar-forge-variant', weaponId: 'rune-mortar' },
  { id: 'recipe-mire-web', name: 'Bataklık Ağı', description: 'Kan Tezgâhı için güçlendirilmiş Yayılım varyantını açar.', regionId: 'rotten-swamp', materialCosts: { 'bog-crystal': 2 }, soulEssenceCost: 150, unlockWeaponVariantId: 'blood-loom-mire-variant', weaponId: 'blood-loom' },
  { id: 'recipe-veil-rift', name: 'Perde Yarığı', description: 'Tutulma Mührü için güçlendirilmiş Yayılım varyantını açar.', regionId: 'cursed-castle', materialCosts: { 'veil-thread': 2 }, soulEssenceCost: 180, unlockWeaponVariantId: 'eclipse-sigil-veil-variant', weaponId: 'eclipse-sigil' }
] as const;
