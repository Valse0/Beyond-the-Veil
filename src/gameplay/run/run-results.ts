import type { RegionId } from '../../core/types/content.js';
import { REGIONS } from '../../data/regions.js';
import { RELICS } from '../../data/relics.js';
import { CRAFTING_MATERIALS } from '../../data/crafting.js';
import { grantCraftingMaterials } from '../crafting/crafting-runtime.js';
import type { SaveData } from '../../systems/save/save-types.js';
import { applyCharacterMastery, calculateRunMasteryPoints } from '../progression/character-mastery.js';
import { applyAchievementCollectionProgress, applyAchievementRunProgress } from '../progression/achievements.js';
import { applyCollectionProgress } from '../progression/collections.js';

export interface BossHuntResultInput {
  regionId: RegionId;
  won: boolean;
  bossChestOpened?: boolean;
  soulEssenceEarned: number;
  relicIdsEarned?: readonly string[];
}

export interface RunResultInput {
  regionId: RegionId;
  won: boolean;
  soulEssenceEarned: number;
  relicIdsEarned?: readonly string[];
  bossChestOpened?: boolean;
  completedTreasureHunt?: boolean;
  craftingMaterialsEarned?: Readonly<Record<string, number>>;
  characterId?: string;
  kills?: number;
  explorationEventsCompleted?: number;
  enemyIdsEarned?: readonly string[];
  weaponIdsEarned?: readonly string[];
  loreIdsEarned?: readonly string[];
  discoveredPathIdsEarned?: readonly string[];
}

function thisRegionSecretPath(regionId:RegionId):string|undefined {
  return REGIONS.find(region=>region.id===regionId)?.explorationPoints[1]?.id;
}

/**
 * Boss Hunt only persists its authored boss reward after a victorious, opened chest.
 * It never advances campaign, mastery, achievements, unrelated collections or run counters.
 */
export function applyBossHuntResult(save: SaveData, result: BossHuntResultInput): SaveData {
  const chestVictory = result.won && result.bossChestOpened === true;
  const relicIds = new Set(save.collections.relicIds);
  if (chestVictory) {
    for (const id of result.relicIdsEarned ?? []) {
      const relic = RELICS.find(item => item.id === id && item.regionId === result.regionId && item.source === 'boss');
      if (relic) relicIds.add(id);
    }
  }
  const reward = chestVictory && Number.isFinite(result.soulEssenceEarned)
    ? Math.max(0, Math.floor(result.soulEssenceEarned))
    : 0;
  return {
    ...save,
    collections: { ...save.collections, relicIds: [...relicIds] },
    progression: { ...save.progression, soulEssence: save.progression.soulEssence + reward }
  };
}

export function applyRunResult(save: SaveData, result: RunResultInput): SaveData {
  const reward = Number.isFinite(result.soulEssenceEarned)
    ? Math.max(0, Math.floor(result.soulEssenceEarned))
    : 0;
  const unlockedRegionIds = new Set(save.progression.unlockedRegionIds);

  if (result.won) {
    const regionIndex = REGIONS.findIndex(region => region.id === result.regionId);
    const nextRegion = regionIndex >= 0 ? REGIONS[regionIndex + 1] : undefined;
    if (nextRegion) unlockedRegionIds.add(nextRegion.id);
  }

  const relicIds = new Set(save.collections.relicIds);
  for (const id of result.relicIdsEarned ?? []) {
    const relic = RELICS.find(item => item.id === id && item.regionId === result.regionId);
    if (!relic) continue;
    const validSource = relic.source === 'boss'
      ? result.won && result.bossChestOpened === true
      : result.completedTreasureHunt === true;
    if (validSource) relicIds.add(id);
  }

  const validMaterials: Record<string, number> = {};
  for (const material of CRAFTING_MATERIALS) {
    const amount = result.craftingMaterialsEarned?.[material.id];
    if (typeof amount === 'number' && Number.isInteger(amount) && amount > 0) validMaterials[material.id] = amount;
  }
  const mastery = result.characterId
    ? applyCharacterMastery(save.collections, result.characterId, calculateRunMasteryPoints(result.kills ?? 0, result.won))
    : save.collections;
  const collectionBase = { ...save.collections, ...mastery, relicIds: [...relicIds] };
  const collectionProgress = applyCollectionProgress(collectionBase, {
    enemyIds: result.enemyIdsEarned,
    weaponIds: result.weaponIdsEarned,
    characterBioIds: result.characterId ? [result.characterId] : [],
    loreIds: result.loreIdsEarned
  });
  const runProgress = result.characterId
    ? applyAchievementRunProgress(collectionProgress, { kills: result.kills ?? 0, won: result.won, characterId: result.characterId, regionId: result.regionId, explorationEventsCompleted: result.explorationEventsCompleted ?? 0, completedCollectionIds: collectionProgress.completedCollectionIds })
    : collectionProgress;
  // Achievement relic rewards are owned relics too, so refresh collection completion after rewards.
  const refreshedCollections = applyCollectionProgress(runProgress, {});
  const achievements = applyAchievementCollectionProgress(refreshedCollections);
  const discoveredPathId=thisRegionSecretPath(result.regionId);
  const unlockedPathIds=new Set(save.story.unlockedPathIds);
  if(discoveredPathId&&(result.discoveredPathIdsEarned??[]).includes(discoveredPathId))unlockedPathIds.add(discoveredPathId);
  return {
    ...save,
    collections: { ...save.collections, ...mastery, ...achievements, relicIds: [...new Set(achievements.relicIds)], craftingMaterials: grantCraftingMaterials(save.collections.craftingMaterials, validMaterials) },
    story: { ...save.story, unlockedPathIds: [...unlockedPathIds] },
    progression: {
      ...save.progression,
      soulEssence: save.progression.soulEssence + reward,
      completedRuns: save.progression.completedRuns + 1,
      unlockedRegionIds: [...unlockedRegionIds]
    }
  };
}
