import { REGION_PATHS } from '../../data/region-paths.js';
import type { RegionId, RegionPathDefinition } from '../../core/types/content.js';

const PATH_BY_ID = new Map(REGION_PATHS.map(path => [path.id, path]));

export function resolveUnlockedRegionPaths(regionId: RegionId, unlockedPathIds: readonly string[]): RegionPathDefinition[] {
  const unlocked = new Set(unlockedPathIds);
  return REGION_PATHS.filter(path => path.regionId === regionId && unlocked.has(path.id));
}

export function isRegionPathUnlocked(pathId: string, regionId: RegionId, unlockedPathIds: readonly string[]): boolean {
  const path = PATH_BY_ID.get(pathId);
  return Boolean(path && path.regionId === regionId && unlockedPathIds.includes(pathId));
}
