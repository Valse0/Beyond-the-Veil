import type { RegionId } from '../core/types/content.js';

export type WeatherId='clear'|'rain'|'fog'|'storm'|'drizzle'|'dry'|'ashfall'|'steam'|'snow'|'dense-fog';
export interface RegionEnvironmentProfile {
  regionId:RegionId;
  weatherCycle:readonly WeatherId[];
}
export const REGION_ENVIRONMENT_PROFILES:readonly RegionEnvironmentProfile[]=[
  {regionId:'cursed-forest',weatherCycle:['clear','rain','fog','storm']},
  {regionId:'forgotten-graveyard',weatherCycle:['clear','dense-fog','drizzle']},
  {regionId:'deep-dungeon',weatherCycle:['dry','ashfall','steam']},
  {regionId:'rotten-swamp',weatherCycle:['rain','dense-fog','storm']},
  {regionId:'cursed-castle',weatherCycle:['fog','snow','storm','clear']}
];
