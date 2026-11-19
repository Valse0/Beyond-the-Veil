import type { RegionId } from '../../core/types/content.js';
import { STORY_REGION_ATMOSPHERES, STORY_WORLD_NPCS } from '../../data/story-world-state.js';

export interface ResolvedStoryWorldState {
  regionId: RegionId;
  npc: {
    definition: (typeof STORY_WORLD_NPCS)[number];
    fateId: string;
    fate: (typeof STORY_WORLD_NPCS)[number]['defaultState'];
  } | null;
  atmosphere: (typeof STORY_REGION_ATMOSPHERES)[number] | null;
}

function readStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => entry[0].length > 0 && typeof entry[1] === 'string'));
}

/** Resolve only authored NPC fates and atmosphere states belonging to the requested region. */
export function resolveStoryWorldState(regionId: RegionId, storyState: unknown): ResolvedStoryWorldState {
  const story = typeof storyState === 'object' && storyState !== null && !Array.isArray(storyState)
    ? storyState as Record<string, unknown>
    : {};
  const npcFates = readStringRecord(story.npcFates);
  const regionAtmospheres = readStringRecord(story.regionAtmospheres);
  const definition = STORY_WORLD_NPCS.find(item => item.regionId === regionId) ?? null;
  const requestedFateId = definition ? npcFates[definition.id] : undefined;
  const fate = definition?.fates.find(item => item.id === requestedFateId) ?? definition?.defaultState ?? null;
  const atmosphereId = regionAtmospheres[regionId];
  const atmosphere = STORY_REGION_ATMOSPHERES.find(item => item.regionId === regionId && item.id === atmosphereId) ?? null;

  return {
    regionId,
    npc: definition && fate ? { definition, fateId: fate.id, fate } : null,
    atmosphere
  };
}
