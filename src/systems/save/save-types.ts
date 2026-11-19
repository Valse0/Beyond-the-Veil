import type { EquipmentProfile } from '../../gameplay/progression/equipment-profiles.js';
import type { CollectionId } from '../../data/collections.js';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface SaveData {
  schemaVersion: 7;
  profile: { createdAt: string; updatedAt: string };
  progression: {
    soulEssence: number;
    completedRuns: number;
    unlockedCharacterIds: string[];
    unlockedRegionIds: string[];
    completedDifficulties: Record<string, string[]>;
    permanentUpgrades: Record<string, number>;
    equippedRelicIds: string[];
    equipmentProfiles: Record<string, EquipmentProfile[]>;
    activeEquipmentProfileIds: Record<string, string>;
  };
  collections: {
    characterMastery: Record<string, number>;
    unlockedCosmeticIds: string[];
    discoveredLoreIds: string[];
    relicIds: string[];
    craftingMaterials: Record<string, number>;
    unlockedWeaponVariantIds: string[];
    unlockedMasteryRewardIds: string[];
    achievementProgress: Record<string, number>;
    completedAchievementIds: string[];
    achievementPlayedCharacterIds: string[];
    achievementExploredRegionIds: string[];
  };
  settings: JsonObject;
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveLoadResult =
  | { status: 'loaded' | 'migrated' | 'recovered' | 'created'; data: SaveData }
  | { status: 'unsupported'; version: number }
  | { status: 'corrupt'; message: string };
