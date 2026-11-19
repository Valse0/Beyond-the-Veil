import { CHARACTERS } from '../../data/characters.js';
import { PASSIVES } from '../../data/passives.js';
import { RELICS } from '../../data/relics.js';
import { WEAPONS } from '../../data/weapons.js';

export const MAX_EQUIPMENT_PROFILES_PER_CHARACTER = 5;
export const MAX_EQUIPMENT_PROFILE_RELICS = 3;
export const MAX_EQUIPMENT_PROFILE_NAME_LENGTH = 28;

export interface EquipmentProfile {
  id: string;
  characterId: string;
  name: string;
  startingWeaponId: string;
  startingPassiveId: string;
  relicIds: string[];
}

export interface EquipmentProfileDraft {
  name: string;
  startingWeaponId: string;
  startingPassiveId: string;
  relicIds?: readonly string[];
}

const CHARACTER_IDS = new Set(CHARACTERS.map(character => character.id));
const WEAPON_IDS = new Set(WEAPONS.map(weapon => weapon.id));
const PASSIVE_IDS = new Set(PASSIVES.map(passive => passive.id));
const RELIC_IDS = new Set(RELICS.map(relic => relic.id));

export function normalizeEquipmentProfileName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildEquipmentProfile(
  id: string,
  characterId: string,
  draft: EquipmentProfileDraft,
  ownedRelicIds: readonly string[]
): EquipmentProfile | null {
  if (typeof id !== 'string' || typeof characterId !== 'string' || !draft || typeof draft !== 'object' || typeof draft.name !== 'string') return null;
  if (draft.relicIds !== undefined && !Array.isArray(draft.relicIds)) return null;
  const name = normalizeEquipmentProfileName(draft.name);
  const relicIds = [...(draft.relicIds ?? [])];
  if (!id.trim() || id.length > 120 || !CHARACTER_IDS.has(characterId)) return null;
  if (!name || name.length > MAX_EQUIPMENT_PROFILE_NAME_LENGTH) return null;
  if (!WEAPON_IDS.has(draft.startingWeaponId) || !PASSIVE_IDS.has(draft.startingPassiveId)) return null;
  if (relicIds.length > MAX_EQUIPMENT_PROFILE_RELICS || new Set(relicIds).size !== relicIds.length) return null;
  const owned = new Set(ownedRelicIds);
  if (!relicIds.every(relicId => RELIC_IDS.has(relicId) && owned.has(relicId))) return null;
  return { id, characterId, name, startingWeaponId: draft.startingWeaponId, startingPassiveId: draft.startingPassiveId, relicIds };
}

export function isEquipmentProfilesRecord(value: unknown, ownedRelicIds: readonly string[]): value is Record<string, EquipmentProfile[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const allIds = new Set<string>();
  for (const [characterId, rawProfiles] of Object.entries(value)) {
    if (!CHARACTER_IDS.has(characterId) || !Array.isArray(rawProfiles) || rawProfiles.length > MAX_EQUIPMENT_PROFILES_PER_CHARACTER) return false;
    const names = new Set<string>();
    for (const rawProfile of rawProfiles) {
      if (typeof rawProfile !== 'object' || rawProfile === null || Array.isArray(rawProfile)) return false;
      const profile = rawProfile as EquipmentProfile;
      const rebuilt = buildEquipmentProfile(profile.id, characterId, profile, ownedRelicIds);
      if (!rebuilt || profile.characterId !== characterId || allIds.has(profile.id)) return false;
      const normalizedName = rebuilt.name.toLocaleLowerCase('en');
      if (names.has(normalizedName)) return false;
      names.add(normalizedName);
      allIds.add(profile.id);
    }
  }
  return true;
}

export function isActiveEquipmentProfileRecord(value: unknown, profiles: Record<string, EquipmentProfile[]>): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  for (const [characterId, profileId] of Object.entries(value)) {
    if (typeof profileId !== 'string' || !profileId) return false;
    if (!profiles[characterId]?.some(profile => profile.id === profileId)) return false;
  }
  return true;
}

export function getActiveEquipmentProfile(
  progression: { equipmentProfiles: Record<string, EquipmentProfile[]>; activeEquipmentProfileIds: Record<string, string> },
  characterId: string
): EquipmentProfile | null {
  const activeId = progression.activeEquipmentProfileIds[characterId];
  return progression.equipmentProfiles[characterId]?.find(profile => profile.id === activeId) ?? null;
}
