import type { RegionDefinition } from '../../core/types/content.js';

export interface HazardCycle { hazardIndex:number; nextAt:number; activeUntil:number; telegraphUntil:number; }
export interface HazardEvent { hazard:RegionDefinition['hazards'][number]; phase:'idle'|'telegraph'|'active'; remainingMs:number; }
export type RegionHazardShape='circle'|'ring'|'line'|'cross';
export interface RegionHazardMechanic {
  shape:RegionHazardShape;
  radius:number;
  damage:number;
  slowMultiplier?:number;
  slowDurationMs?:number;
  poisonStacks?:number;
  poisonDurationMs?:number;
  pushForce?:number;
  summonEnemyId?:string;
  summonCount?:number;
}
const mechanics:Record<string,RegionHazardMechanic>={
  'forest-poison-bloom':{shape:'circle',radius:76,damage:6,poisonStacks:2,poisonDurationMs:4_000},
  'forest-thorn-root':{shape:'line',radius:210,damage:12,slowMultiplier:.72,slowDurationMs:900},
  'forest-hidden-nest':{shape:'circle',radius:82,damage:0,summonEnemyId:'rootbound-husk',summonCount:2},
  'forest-element-flora':{shape:'ring',radius:92,damage:10,slowMultiplier:.65,slowDurationMs:1_200},
  'grave-cursed-tomb':{shape:'circle',radius:72,damage:14,pushForce:90},
  'grave-spirit-burst':{shape:'ring',radius:108,damage:12,slowMultiplier:.75,slowDurationMs:700},
  'grave-temporary-portal':{shape:'circle',radius:88,damage:0,summonEnemyId:'wailing-wisp',summonCount:2},
  'grave-awakening':{shape:'circle',radius:70,damage:0,summonEnemyId:'bone-skitter',summonCount:1},
  'dungeon-fire-trap':{shape:'line',radius:230,damage:16},
  'dungeon-spike-floor':{shape:'cross',radius:94,damage:14,pushForce:90},
  'dungeon-moving-machinery':{shape:'line',radius:190,damage:9,pushForce:150},
  'dungeon-rune-lock':{shape:'cross',radius:110,damage:12,slowMultiplier:.75,slowDurationMs:1_000},
  'swamp-toxic-water':{shape:'circle',radius:96,damage:4,poisonStacks:2,poisonDurationMs:4_500},
  'swamp-slow-mud':{shape:'circle',radius:100,damage:0,slowMultiplier:.65,slowDurationMs:1_600},
  'swamp-rotting-ground':{shape:'ring',radius:90,damage:18,pushForce:120},
  'swamp-hidden-enemy':{shape:'circle',radius:86,damage:0,summonEnemyId:'mire-lurker',summonCount:1},
  'castle-cursed-seal':{shape:'ring',radius:96,damage:14,slowMultiplier:.65,slowDurationMs:1_100},
  'castle-dark-flame':{shape:'line',radius:240,damage:18},
  'castle-shifting-passage':{shape:'cross',radius:112,damage:10,pushForce:130},
  'castle-phase-arena':{shape:'ring',radius:138,damage:16,pushForce:110}
};
export function getRegionHazardMechanic(hazardId:string):RegionHazardMechanic|undefined {
  const mechanic=mechanics[hazardId];
  return mechanic?{...mechanic}:undefined;
}
export function createHazardCycle(startAt=0):HazardCycle {
  return {hazardIndex:0,nextAt:startAt+6_500,activeUntil:0,telegraphUntil:0};
}
export function stepRegionHazard(region:RegionDefinition,cycle:HazardCycle,now:number):{cycle:HazardCycle;event:HazardEvent} {
  const hazard=region.hazards[cycle.hazardIndex%region.hazards.length]!;
  let next={...cycle};
  if(now>=cycle.nextAt&&cycle.activeUntil===0)next={...cycle,telegraphUntil:now+hazard.telegraphMs,activeUntil:now+hazard.telegraphMs+2_200};
  const phase:HazardEvent['phase']=now<next.telegraphUntil?'telegraph':now<next.activeUntil?'active':'idle';
  if(next.activeUntil>0&&now>=next.activeUntil)next={hazardIndex:(next.hazardIndex+1)%region.hazards.length,nextAt:now+6_500,activeUntil:0,telegraphUntil:0};
  return {cycle:next,event:{hazard,phase,remainingMs:Math.max(0,(phase==='telegraph'?next.telegraphUntil:next.activeUntil)-now)}};
}
