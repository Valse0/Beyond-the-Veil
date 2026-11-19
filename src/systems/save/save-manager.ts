import { CHARACTERS } from '../../data/characters.js';
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

const CURRENT_SCHEMA_VERSION = 4;
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
    && equippedRelicIds.every(id => ownedRelicIds.includes(id))
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
      unlockedCharacterIds: [CHARACTERS[0]!.id],
      unlockedRegionIds: [REGIONS[0]!.id],
      completedDifficulties: {},
      permanentUpgrades: {},
      equippedRelicIds: []
    },
    collections: { characterMastery: {}, unlockedCosmeticIds: [], discoveredLoreIds: [], relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [] },
    settings: {}
  };
}

function migrateV0(value: Record<string, unknown>, now: string): SaveData {
  const defaults = createInitialSaveData(now);
  const profile = isObject(value.profile) ? value.profile : {};
  const progression = isObject(value.progression) ? value.progression : {};
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = {
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
      equippedRelicIds: []
    },
    collections: {
      characterMastery: isNumberRecord(collections.characterMastery) ? collections.characterMastery : defaults.collections.characterMastery,
      unlockedCosmeticIds: isStringArray(collections.unlockedCosmeticIds) ? collections.unlockedCosmeticIds : defaults.collections.unlockedCosmeticIds,
      discoveredLoreIds: isStringArray(collections.discoveredLoreIds) ? collections.discoveredLoreIds : defaults.collections.discoveredLoreIds,
      relicIds: [],
      craftingMaterials: {},
      unlockedWeaponVariantIds: []
    },
    settings: isJsonObject(value.settings) ? value.settings : defaults.settings
  };
  if (!isSaveData(candidate)) throw new Error('Legacy save contains invalid values.');
  return candidate;
}

function migrateV1(value: Record<string, unknown>): SaveData {
  const progression = value.progression;
  if (!isObject(progression)) throw new Error('Legacy version-one progression is invalid.');
  const upgrades = progression.permanentUpgrades === undefined ? {} : progression.permanentUpgrades;
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    progression: { ...progression, permanentUpgrades: upgrades, equippedRelicIds: [] },
    collections: { ...collections, relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [] }
  };
  if (!isSaveData(candidate)) throw new Error('Legacy version-one save contains invalid values.');
  return candidate;
}

function migrateV2(value: Record<string, unknown>): SaveData {
  const progression = isObject(value.progression) ? value.progression : {};
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    progression: { ...progression, equippedRelicIds: [] },
    collections: { ...collections, relicIds: [], craftingMaterials: {}, unlockedWeaponVariantIds: [] }
  };
  if (!isSaveData(candidate)) throw new Error('Legacy version-two save contains invalid values.');
  return candidate;
}

function migrateV3(value: Record<string, unknown>): SaveData {
  const collections = isObject(value.collections) ? value.collections : {};
  const candidate: unknown = {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    collections: { ...collections, craftingMaterials: {}, unlockedWeaponVariantIds: [] }
  };
  if (!isSaveData(candidate)) throw new Error('Legacy version-three save contains invalid values.');
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
      if (!isSaveData(value)) return { status: 'corrupt', message: 'Save data failed validation.' };
      return { status: 'loaded', data: value };
    } catch (error) {
      return { status: 'corrupt', message: error instanceof Error ? error.message : 'Save could not be parsed.' };
    }
  }
}
