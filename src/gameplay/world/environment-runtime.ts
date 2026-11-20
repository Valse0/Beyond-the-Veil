import type { ElementId, RegionId } from '../../core/types/content.js';
import { REGION_ENVIRONMENT_PROFILES, type WeatherId } from '../../data/environment-profiles.js';

export type TimeOfDay='dawn'|'day'|'sunset'|'night';
export interface EnvironmentState {
  regionId:RegionId; elapsedMs:number; timeOfDay:TimeOfDay; timeLabel:string; weather:WeatherId; weatherLabel:string;
  phaseProgress:number; enemyMoveSpeedMultiplier:number; elementDamageMultipliers:Partial<Record<ElementId,number>>;
}
export const GAME_DAY_MS=16*60_000;
export const DAY_PHASE_MS=GAME_DAY_MS/4;
export const WEATHER_PHASE_MS=4*60_000;
const timeLabels:Record<TimeOfDay,string>={dawn:'ŞAFAK',day:'GÜNDÜZ',sunset:'GÜNBATIMI',night:'GECE'};
const weatherLabels:Record<WeatherId,string>={clear:'AÇIK',rain:'YAĞMUR',fog:'SİS',storm:'FIRTINA',drizzle:'ÇİSENTİ',dry:'KURU SICAK',ashfall:'KÜL YAĞIŞI',steam:'SICAK BUHAR',snow:'KAR','dense-fog':'YOĞUN SİS'};
const weatherModifiers:Partial<Record<WeatherId,Partial<Record<ElementId,number>>>>={rain:{fire:.92,lightning:1.08},drizzle:{fire:.97,lightning:1.04},storm:{fire:.95,lightning:1.16},snow:{ice:1.12},ashfall:{fire:1.08,lightning:.94},steam:{fire:1.05,ice:.96}};
export function resolveEnvironment(regionId:RegionId,elapsedMs:number):EnvironmentState {
  const profile=REGION_ENVIRONMENT_PROFILES.find(item=>item.regionId===regionId);
  if(!profile)throw new Error('Missing environment profile for region: '+regionId);
  const elapsed=Math.max(0,Number.isFinite(elapsedMs)?elapsedMs:0);
  const dayPosition=elapsed%GAME_DAY_MS;
  const phaseIndex=Math.floor(dayPosition/DAY_PHASE_MS);
  const timeOfDay=(['dawn','day','sunset','night'] as const)[phaseIndex]!;
  const weatherIndex=Math.floor(elapsed/WEATHER_PHASE_MS)%profile.weatherCycle.length;
  const weather=profile.weatherCycle[weatherIndex]!;
  return {regionId,elapsedMs:elapsed,timeOfDay,timeLabel:timeLabels[timeOfDay],weather,weatherLabel:weatherLabels[weather],phaseProgress:(dayPosition%DAY_PHASE_MS)/DAY_PHASE_MS,enemyMoveSpeedMultiplier:timeOfDay==='night'?1.04:1,elementDamageMultipliers:{...(weatherModifiers[weather]??{})}};
}
export function getElementWeatherMultiplier(environment:EnvironmentState,element:ElementId|undefined):number {return element?environment.elementDamageMultipliers[element]??1:1;}
export function getEnvironmentLabel(environment:EnvironmentState):string {return environment.timeLabel+'  •  '+environment.weatherLabel;}
