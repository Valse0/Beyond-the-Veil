import { CHARACTERS } from '../../data/characters.js';
import { isAchievementCharacterIdArray, isAchievementIdArray, isAchievementProgressRecord, isAchievementRegionIdArray } from '../../data/achievements.js';
import { isCollectionIdArray, isCollectionItemIdArray, isCollectionRewardIdArray } from '../../data/collections.js';
import { RELICS } from '../../data/relics.js';
import { CRAFTING_MATERIALS, CRAFTING_RECIPES } from '../../data/crafting.js';
import { WEAPONS } from '../../data/weapons.js';
import { craftRecipe as craftInventoryRecipe } from '../../gameplay/crafting/crafting-runtime.js';
import { equipRelic as equipRelicIds, unequipRelic as unequipRelicIds } from '../../gameplay/relics/relic-runtime.js';
import { REGIONS } from '../../data/regions.js';
import { SAVE_BACKUP_KEY, SAVE_STORAGE_KEY } from './save-storage.js';
import type { JsonObject, JsonValue, SaveData, SaveLoadResult, SaveStorage } from './save-types.js';
import { calculatePermanentUpgradeRespec, getPermanentUpgradeCost, getPermanentUpgradeDefinition, isValidPermanentUpgradeRecord } from '../../gameplay/progression/permanent-upgrades.js';
import type { PermanentUpgradeRespecQuote } from '../../gameplay/progression/permanent-upgrades.js';
import { createInitialQuestStoryState, isQuestStoryState } from '../../gameplay/quests/quest-runtime.js';
import { buildEquipmentProfile, getActiveEquipmentProfile, isActiveEquipmentProfileRecord, isEquipmentProfilesRecord, MAX_EQUIPMENT_PROFILES_PER_CHARACTER, type EquipmentProfile, type EquipmentProfileDraft } from '../../gameplay/progression/equipment-profiles.js';

const CURRENT_SCHEMA_VERSION = 11;
const RELIC_IDS = new Set(RELICS.map(relic => relic.id));
const MATERIAL_IDS = new Set(CRAFTING_MATERIALS.map(material => material.id));
const WEAPON_VARIANT_IDS = new Set(WEAPONS.flatMap(weapon => weapon.branches.flatMap(branch => branch.variant ? [branch.variant.id] : [])));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function isRelicIdArray(value: unknown): value is string[] {
  return isStringArray(value) && value.every(id => RELIC_IDS.has(id)) && new Set(value).size === value.length;
}
function isMaterialCountRecord(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.entries(value).every(([id, count]) => MATERIAL_IDS.has(id) && typeof count === 'number' && Number.isInteger(count) && count >= 0 && count <= 99);
}
function isWeaponVariantIdArray(value: unknown): value is string[] {
  return isStringArray(value) && value.every(id => WEAPON_VARIANT_IDS.has(id)) && new Set(value).size === value.length;
}
function isNumberRecord(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0);
}
function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  return isObject(value) && Object.values(value).every(isStringArray);
}
function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isObject(value) && Object.values(value).every(isJsonValue);
}
function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value) && Object.values(value).every(isJsonValue);
}
function isSaveData(value: unknown): value is SaveData {
  if (!isObject(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;
  const profile = value.profile;
  const progression = value.progression;
  const collections = value.collections;
  const equippedRelicIds = isObject(progression) ? progression.equippedRelicIds : undefined;
  const ownedRelicIds = isObject(collections) ? collections.relicIds : undefined;
  const craftingMaterials = isObject(collections) ? collections.craftingMaterials : undefined;
  const unlockedWeaponVariantIds = isObject(collections) ? collections.unlockedWeaponVariantIds : undefined;
  const unlockedMasteryRewardIds = isObject(collections) ? collections.unlockedMasteryRewardIds : undefined;
  const equipmentProfiles = isObject(progression) ? progression.equipmentProfiles : undefined;
  const activeEquipmentProfileIds = isObject(progression) ? progression.activeEquipmentProfileIds : undefined;
  const achievementProgress = isObject(collections) ? collections.achievementProgress : undefined;
  const completedAchievementIds = isObject(collections) ? collections.completedAchievementIds : undefined;
  const achievementPlayedCharacterIds = isObject(collections) ? collections.achievementPlayedCharacterIds : undefined;
  const achievementExploredRegionIds = isObject(collections) ? collections.achievementExploredRegionIds : undefined;
  const discoveredEnemyIds = isObject(collections) ? collections.discoveredEnemyIds : undefined;
  const discoveredWeaponIds = isObject(collections) ? collections.discoveredWeaponIds : undefined;
  const discoveredCharacterBioIds = isObject(collections) ? collections.discoveredCharacterBioIds : undefined;
  const completedCollectionIds = isObject(collections) ? collections.completedCollectionIds : undefined;
  const unlockedCollectionRewardIds = isObject(collections) ? collections.unlockedCollectionRewardIds : undefined;
  return isObject(profile)
    && typeof profile.createdAt === 'string'
    && typeof profile.updatedAt === 'string'
    && isObject(progression)
    && typeof progression.soulEssence === 'number'
    && Number.isFinite(progression.soulEssence)
    && progression.soulEssence >= 0
    && typeof progression.completedRuns === 'number'
    && Number.isInteger(progression.completedRuns)
    && progression.completedRuns >= 0
    && typeof progression.newGamePlusLevel === 'number'
    && Number.isInteger(progression.newGamePlusLevel)
    && progression.newGamePlusLevel >= 0
    && progression.newGamePlusLevel <= 5
    && isStringArray(progression.completedEndingIds)
    && new Set(progression.completedEndingIds).size === progression.completedEndingIds.length
    && isStringArray(progression.unlockedCharacterIds)
    && progression.unlockedCharacterIds.length > 0
    && isStringArray(progression.unlockedRegionIds)
    && progression.unlockedRegionIds.length > 0
    && isStringArrayRecord(progression.completedDifficulties)
    && isValidPermanentUpgradeRecord(progression.permanentUpgrades)
    && isRelicIdArray(equippedRelicIds)
    && equippedRelicIds.length <= 3
    && isObject(collections)
    && isNumberRecord(collections.characterMastery)
    && isStringArray(collections.unlockedCosmeticIds)
    && isStringArray(collections.discoveredLoreIds)
    && isRelicIdArray(ownedRelicIds)
    && isMaterialCountRecord(craftingMaterials)
    && isWeaponVariantIdArray(unlockedWeaponVariantIds)
    && isStringArray(unlockedMasteryRewardIds)
    && new Set(unlockedMasteryRewardIds).size === unlockedMasteryRewardIds.length
    && isAchievementProgressRecord(achievementProgress)
    && isAchievementIdArray(completedAchievementIds)
    && isAchievementCharacterIdArray(achievementPlayedCharacterIds)
    && isAchievementRegionIdArray(achievementExploredRegionIds)
    && isCollectionItemIdArray('bestiary', discoveredEnemyIds)
    && isCollectionItemIdArray('arsenal', discoveredWeaponIds)
    && isCollectionItemIdArray('character-biographies', discoveredCharacterBioIds)
    && isCollectionIdArray(completedCollectionIds)
    && isCollectionRewardIdArray(unlockedCollectionRewardIds)
    && equippedRelicIds.every(id => ownedRelicIds.includes(id))
    && isEquipmentProfilesRecord(equipmentProfiles, ownedRelicIds)
    && isActiveEquipmentProfileRecord(activeEquipmentProfileIds, equipmentProfiles)
    && isQuestStoryState(value.story)
    && isJsonObject(value.settings);
}
function parseSave(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

export function createInitialSaveData(now = new Date().toISOString()): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: { createdAt: now, updatedAt: now },
    progression: {
      soulEssence: 0,
      completedRuns: 0,
      newGamePlusLevel: 0,
      completedEndingIds: [],
      unlockedCharacterIds: [CHARACTERS[0]!.id],
      unlockedRegionIds: [REGIONS[0]!.id],
      completedDifficulties: {},
      permanentUpgrades: {},
      equippedRelicIds: [],
      equipmentProfiles: {},
      activeEquipmentProfileIds: {}
    },
    collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] },
    story: createInitialQuestStoryState(),
    settings: {}
  };
}

function withNewGamePlusDefaults(value: Record<string, unknown>): Record<string, unknown> {
  const progression = isObject(value.progression) ? value.progression : {};
  return {
    ...value,
    progression: {
      ...progression,
      newGamePlusLevel: typeof progression.newGamePlusLevel === 'number' ? progression.newGamePlusLevel : 0,
      completedEndingIds: isStringArray(progression.completedEndingIds) ? progression.completedEndingIds : []
    }
  };
}

function migrateV0(value: Record<string, unknown>, now: string): SaveData {
  const defaults = createInitialSaveData(now);
  const profile = isObject(value.profile) ? value.profile : {};
  const progression = isObject(value.progression) ? value.progression : {};
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: {
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : defaults.profile.createdAt,
      updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : now
    },
    progression: {
      soulEssence: typeof progression.soulEssence === 'number' ? progression.soulEssence : defaults.progression.soulEssence,
      completedRuns: typeof progression.completedRuns === 'number' ? progression.completedRuns : defaults.progression.completedRuns,
      unlockedCharacterIds: isStringArray(progression.unlockedCharacterIds) && progression.unlockedCharacterIds.length
        ? progression.unlockedCharacterIds : defaults.progression.unlockedCharacterIds,
      unlockedRegionIds: isStringArray(progression.unlockedRegionIds) && progression.unlockedRegionIds.length
        ? progression.unlockedRegionIds : defaults.progression.unlockedRegionIds,
      completedDifficulties: isStringArrayRecord(progression.completedDifficulties)
        ? progression.completedDifficulties : defaults.progression.completedDifficulties,
      permanentUpgrades: isValidPermanentUpgradeRecord(progression.permanentUpgrades)
        ? progression.permanentUpgrades : defaults.progression.permanentUpgrades,
      equippedRelicIds: [],
      equipmentProfiles: {},
      activeEquipmentProfileIds: {}
    },
    collections: {
      characterMastery: isNumberRecord(collections.characterMastery) ? collections.characterMastery : defaults.collections.characterMastery,
      unlockedCosmeticIds: isStringArray(collections.unlockedCosmeticIds) ? collections.unlockedCosmeticIds : defaults.collections.unlockedCosmeticIds,
      discoveredLoreIds: isStringArray(collections.discoveredLoreIds) ? collections.discoveredLoreIds : defaults.collections.discoveredLoreIds,
      relicIds: [],
      craftingMaterials: {},
      unlockedWeaponVariantIds: [],
      unlockedMasteryRewardIds: [],
      achievementProgress: {},
      completedAchievementIds: [],
      achievementPlayedCharacterIds: [],
      achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: []
    },
    story: createInitialQuestStoryState(),
    settings: isJsonObject(value.settings) ? value.settings : defaults.settings
  });
  if (!isSaveData(candidate)) throw new Error('Legacy save contains invalid values.');
  return candidate;
}

function migrateV1(value: Record<string, unknown>): SaveData {
  const progression = value.progression;
  if (!isObject(progression)) throw new Error('Legacy version-one progression is invalid.');
  const upgrades = progression.permanentUpgrades === undefined ? {} : progression.permanentUpgrades;
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(),
    progression: { ...progression, permanentUpgrades: upgrades, equippedRelicIds: [], equipmentProfiles: {}, activeEquipmentProfileIds: {} },
    collections: { ...collections, relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] }
  });
  if (!isSaveData(candidate)) throw new Error('Legacy version-one save contains invalid values.');
  return candidate;
}

function migrateV2(value: Record<string, unknown>): SaveData {
  const progression = isObject(value.progression) ? value.progression : {};
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(),
    progression: { ...progression, equippedRelicIds: [], equipmentProfiles: {}, activeEquipmentProfileIds: {} },
    collections: { ...collections, relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] }
  });
  if (!isSaveData(candidate)) throw new Error('Legacy version-two save contains invalid values.');
  return candidate;
}

function migrateV3(value: Record<string, unknown>): SaveData {
  const collections = isObject(value.collections) ? value.collections : {};
  const progression = isObject(value.progression) ? value.progression : {};
  const candidate: unknown = withNewGamePlusDefaults({
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(),
    progression: { ...progression, equipmentProfiles: {}, activeEquipmentProfileIds: {} },
    collections: { ...collections, craftingMaterials: {}, unlockedWeaponVariantIds: [], unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] }
  });
  if (!isSaveData(candidate)) throw new Error('Legacy version-three save contains invalid values.');
  return candidate;
}

function migrateV4(value: Record<string, unknown>): SaveData {
  const collections = isObject(value.collections) ? value.collections : {};
  const progression = isObject(value.progression) ? value.progression : {};
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(), collections: { ...collections, unlockedMasteryRewardIds: [], achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] }, progression: { ...progression, equipmentProfiles: {}, activeEquipmentProfileIds: {} } });
  if (!isSaveData(candidate)) throw new Error('Legacy version-four save contains invalid values.');
  return candidate;
}

function migrateV5(value: Record<string, unknown>): SaveData {
  const progression = isObject(value.progression) ? value.progression : {};
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(), progression: { ...progression, equipmentProfiles: {}, activeEquipmentProfileIds: {} }, collections: { ...collections, achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] } });
  if (!isSaveData(candidate)) throw new Error('Legacy version-five save contains invalid values.');
  return candidate;
}

function migrateV6(value: Record<string, unknown>): SaveData {
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(), collections: { ...collections, achievementProgress: {}, completedAchievementIds: [], achievementPlayedCharacterIds: [], achievementExploredRegionIds: [], discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] } });
  if (!isSaveData(candidate)) throw new Error('Legacy version-six save contains invalid values.');
  return candidate;
}

function migrateV7(value: Record<string, unknown>): SaveData {
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION,
    story: createInitialQuestStoryState(), collections: { ...collections, discoveredEnemyIds: [], discoveredWeaponIds: [], discoveredCharacterBioIds: [], completedCollectionIds: [], unlockedCollectionRewardIds: [] } });
  if (!isSaveData(candidate)) throw new Error('Legacy version-seven save contains invalid values.');
  return candidate;
}


function migrateV8(value: Record<string, unknown>): SaveData {
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION, story: createInitialQuestStoryState() });
  if (!isSaveData(candidate)) throw new Error('Legacy version-eight save contains invalid values.');
  return candidate;
}

function migrateV9(value: Record<string, unknown>): SaveData {
  if (!isObject(value.story)) throw new Error('Legacy version-nine story state is invalid.');
  const candidate: unknown = withNewGamePlusDefaults({ ...value, schemaVersion: CURRENT_SCHEMA_VERSION, story: { ...value.story, completedEndingId: null } });
  if (!isSaveData(candidate)) throw new Error('Legacy version-nine save contains invalid values.');
  return candidate;
}

function migrateV10(value: Record<string, unknown>): SaveData {
  const progression = isObject(value.progression) ? value.progression : {};
  const story = isObject(value.story) ? value.story : {};
  const completedEndingIds = typeof story.completedEndingId === 'string' && story.completedEndingId.length > 0
    ? [story.completedEndingId]
    : [];
  const candidate: unknown = {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    progression: { ...progression, newGamePlusLevel: 0, completedEndingIds }
  };
  if (!isSaveData(candidate)) throw new Error('Legacy version-ten save contains invalid values.');
  return candidate;
}

export class SaveManager {
  constructor(
    private readonly storage: SaveStorage,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  load(): SaveLoadResult {
    const primary = this.storage.getItem(SAVE_STORAGE_KEY);
    const backup = this.storage.getItem(SAVE_BACKUP_KEY);
    if (primary === null && backup === null) return { status: 'created', data: createInitialSaveData(this.now()) };

    if (primary !== null) {
      const result = this.decode(primary);
      if (result.status === 'unsupported') return result;
      if (result.status === 'loaded') return result;
      if (result.status === 'migrated') {
        this.save(result.data);
        return result;
      }
    }

    if (backup !== null) {
      const result = this.decode(backup);
      if (result.status === 'unsupported') return result;
      if (result.status === 'loaded' || result.status === 'migrated') {
        try { this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(result.data)); } catch { /* Keep the recovered data available even if storage is read-only. */ }
        return { status: 'recovered', data: result.data };
      }
    }
    return { status: 'corrupt', message: 'The primary and backup save are missing or invalid.' };
  }

  save(data: SaveData): void {
    if (!isSaveData(data)) throw new Error('Refusing to write an invalid save.');
    const current = this.storage.getItem(SAVE_STORAGE_KEY);
    if (current !== null) {
      const decoded = this.decode(current);
      if (decoded.status === 'unsupported') throw new Error('A newer save exists; refusing to overwrite it.');
      if (decoded.status === 'loaded' || decoded.status === 'migrated') {
        this.storage.setItem(SAVE_BACKUP_KEY, current);
      }
    }
    const updated: SaveData = {
      ...data,
      profile: { ...data.profile, updatedAt: this.now() }
    };
    this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(updated));
  }

  export(): string {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') {
      throw new Error(result.status === 'unsupported' ? 'This save was created by a newer game version.' : result.message);
    }
    return JSON.stringify(result.data, null, 2);
  }

  import(raw: string): SaveData {
    const decoded = this.decode(raw);
    if (decoded.status === 'unsupported') throw new Error('This save was created by a newer game version.');
    if (decoded.status === 'corrupt') throw new Error(decoded.message);
    this.save(decoded.data);
    return decoded.data;
  }

  reset(): void {
    this.storage.removeItem(SAVE_STORAGE_KEY);
    this.storage.removeItem(SAVE_BACKUP_KEY);
  }

  getEquipmentProfiles(characterId: string): EquipmentProfile[] {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return [];
    return (result.data.progression.equipmentProfiles[characterId] ?? []).map(profile => ({ ...profile, relicIds: [...profile.relicIds] }));
  }

  getActiveEquipmentProfile(characterId: string): EquipmentProfile | null {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return null;
    const profile = getActiveEquipmentProfile(result.data.progression, characterId);
    return profile ? { ...profile, relicIds: [...profile.relicIds] } : null;
  }

  createEquipmentProfile(characterId: string, draft: EquipmentProfileDraft): string | null {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return null;
    const data = result.data;
    if (!CHARACTERS.some(character => character.id === characterId) || !data.progression.unlockedCharacterIds.includes(characterId)) return null;
    const profiles = data.progression.equipmentProfiles[characterId] ?? [];
    if (profiles.length >= MAX_EQUIPMENT_PROFILES_PER_CHARACTER) return null;
    const normalizedName = draft.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
    if (profiles.some(profile => profile.name.toLocaleLowerCase('en') === normalizedName)) return null;
    const timestamp = this.now().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'profile';
    let id = '';
    for (let suffix = 1; suffix <= MAX_EQUIPMENT_PROFILES_PER_CHARACTER + 1; suffix++) {
      id = 'equipment-' + characterId + '-' + timestamp + '-' + suffix;
      if (!Object.values(data.progression.equipmentProfiles).flat().some(profile => profile.id === id)) break;
    }
    const profile = buildEquipmentProfile(id, characterId, draft, data.collections.relicIds);
    if (!profile) return null;
    data.progression.equipmentProfiles[characterId] = [...profiles, profile];
    try { this.save(data); return id; } catch { return null; }
  }

  updateEquipmentProfile(characterId: string, profileId: string, changes: Partial<EquipmentProfileDraft>): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const data = result.data;
    const profiles = data.progression.equipmentProfiles[characterId];
    const index = profiles?.findIndex(profile => profile.id === profileId) ?? -1;
    if (!profiles || index < 0) return false;
    const current = profiles[index]!;
    const draft: EquipmentProfileDraft = {
      name: changes.name ?? current.name,
      startingWeaponId: changes.startingWeaponId ?? current.startingWeaponId,
      startingPassiveId: changes.startingPassiveId ?? current.startingPassiveId,
      relicIds: changes.relicIds ?? current.relicIds
    };
    const normalizedName = draft.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
    if (profiles.some((profile, profileIndex) => profileIndex !== index && profile.name.toLocaleLowerCase('en') === normalizedName)) return false;
    const updated = buildEquipmentProfile(profileId, characterId, draft, data.collections.relicIds);
    if (!updated) return false;
    profiles[index] = updated;
    try { this.save(data); return true; } catch { return false; }
  }

  deleteEquipmentProfile(characterId: string, profileId: string): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const data = result.data;
    const profiles = data.progression.equipmentProfiles[characterId];
    if (!profiles?.some(profile => profile.id === profileId)) return false;
    data.progression.equipmentProfiles[characterId] = profiles.filter(profile => profile.id !== profileId);
    if (data.progression.activeEquipmentProfileIds[characterId] === profileId) delete data.progression.activeEquipmentProfileIds[characterId];
    if (data.progression.equipmentProfiles[characterId].length === 0) delete data.progression.equipmentProfiles[characterId];
    try { this.save(data); return true; } catch { return false; }
  }

  activateEquipmentProfile(characterId: string, profileId: string): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const data = result.data;
    if (!data.progression.equipmentProfiles[characterId]?.some(profile => profile.id === profileId)) return false;
    data.progression.activeEquipmentProfileIds[characterId] = profileId;
    try { this.save(data); return true; } catch { return false; }
  }

  getPermanentUpgradeLevel(upgradeId: string): number {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return 0;
    return result.data.progression.permanentUpgrades[upgradeId] ?? 0;
  }

  purchasePermanentUpgrade(upgradeId: string, cost: number, maxLevel?: number): boolean {
    const definition = getPermanentUpgradeDefinition(upgradeId);
    if (!definition || !Number.isFinite(cost) || !Number.isInteger(cost) || cost < 0) return false;
    if (maxLevel !== undefined && maxLevel !== definition.maxLevel) return false;
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const data = result.data;
    const currentLevel = data.progression.permanentUpgrades[upgradeId] ?? 0;
    const expectedCost = getPermanentUpgradeCost(upgradeId, currentLevel);
    if (expectedCost === null || cost !== expectedCost || currentLevel >= definition.maxLevel || data.progression.soulEssence < expectedCost) return false;
    data.progression.soulEssence -= expectedCost;
    data.progression.permanentUpgrades[upgradeId] = currentLevel + 1;
    this.save(data);
    return true;
  }

  getPermanentUpgradeRespecQuote(): PermanentUpgradeRespecQuote | null {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return null;
    return calculatePermanentUpgradeRespec(result.data.progression.permanentUpgrades);
  }

  respecPermanentUpgrades(): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;

    const data = result.data;
    const quote = calculatePermanentUpgradeRespec(data.progression.permanentUpgrades);
    if (quote.totalInvested <= 0) return false;

    data.progression.soulEssence += quote.refund;
    data.progression.permanentUpgrades = {};
    try {
      this.save(data);
      return true;
    } catch {
      // save() keeps the previous primary intact if a storage write fails.
      return false;
    }
  }

  acquireRelics(relicIds: readonly string[]): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const owned = new Set(result.data.collections.relicIds);
    for (const id of relicIds) if (RELIC_IDS.has(id)) owned.add(id);
    const next = [...owned];
    if (next.length === result.data.collections.relicIds.length) return true;
    result.data.collections.relicIds = next;
    try { this.save(result.data); return true; } catch { return false; }
  }

  equipRelic(relicId: string, slot?: number): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const next = equipRelicIds(result.data.collections.relicIds, result.data.progression.equippedRelicIds, relicId, slot);
    if (!next) return false;
    result.data.progression.equippedRelicIds = next;
    try { this.save(result.data); return true; } catch { return false; }
  }

  unequipRelic(relicId: string): boolean {
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    if (!result.data.progression.equippedRelicIds.includes(relicId)) return false;
    result.data.progression.equippedRelicIds = unequipRelicIds(result.data.progression.equippedRelicIds, relicId);
    try { this.save(result.data); return true; } catch { return false; }
  }

  craftRecipe(recipeId: string): boolean {
    const recipe = CRAFTING_RECIPES.find(item => item.id === recipeId);
    if (!recipe) return false;
    const result = this.load();
    if (result.status === 'unsupported' || result.status === 'corrupt') return false;
    const data = result.data;
    const crafted = craftInventoryRecipe({
      soulEssence: data.progression.soulEssence,
      materials: data.collections.craftingMaterials,
      unlockedWeaponVariantIds: data.collections.unlockedWeaponVariantIds
    }, recipeId);
    if (!crafted) return false;
    data.progression.soulEssence = crafted.soulEssence;
    data.collections.craftingMaterials = crafted.materials;
    data.collections.unlockedWeaponVariantIds = crafted.unlockedWeaponVariantIds;
    try { this.save(data); return true; } catch { return false; }
  }

  private decode(raw: string): SaveLoadResult {
    try {
      const value = parseSave(raw);
      if (!isObject(value)) return { status: 'corrupt', message: 'Save root must be an object.' };
      const version = value.schemaVersion === undefined ? 0 : value.schemaVersion;
      if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
        return { status: 'corrupt', message: 'Save schema version is invalid.' };
      }
      if (version > CURRENT_SCHEMA_VERSION) return { status: 'unsupported', version };
      if (version === 0) return { status: 'migrated', data: migrateV0(value, this.now()) };
      if (version === 1) return { status: 'migrated', data: migrateV1(value) };
      if (version === 2) return { status: 'migrated', data: migrateV2(value) };
      if (version === 3) return { status: 'migrated', data: migrateV3(value) };
      if (version === 4) return { status: 'migrated', data: migrateV4(value) };
      if (version === 5) return { status: 'migrated', data: migrateV5(value) };
      if (version === 6) return { status: 'migrated', data: migrateV6(value) };
      if (version === 7) return { status: 'migrated', data: migrateV7(value) };
      if (version === 8) return { status: 'migrated', data: migrateV8(value) };
      if (version === 9) return { status: 'migrated', data: migrateV9(value) };
      if (version === 10) return { status: 'migrated', data: migrateV10(value) };
      if (!isSaveData(value)) return { status: 'corrupt', message: 'Save data failed validation.' };
      return { status: 'loaded', data: value };
    } catch (error) {
      return { status: 'corrupt', message: error instanceof Error ? error.message : 'Save could not be parsed.' };
    }
  }
}
