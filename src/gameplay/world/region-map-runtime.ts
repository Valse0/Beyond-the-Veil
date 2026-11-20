import type { RegionId } from '../../core/types/content.js';
import { getRegionMapLayout, buildRegionMapBoundary, validateRegionMapConnectivity } from '../../data/region-layouts.js';
export type { RegionMapLayout } from '../../data/region-layouts.js';

export function resolveRegionMap(regionId:RegionId) {
  const layout=getRegionMapLayout(regionId);
  return {layout,boundary:buildRegionMapBoundary(layout),connected:validateRegionMapConnectivity(layout)};
}
export { getRegionMapLayout, isRegionMapWalkable, resolveRegionMapPosition, buildRegionMapBoundary, validateRegionMapConnectivity } from '../../data/region-layouts.js';
