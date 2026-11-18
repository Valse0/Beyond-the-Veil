import type { RegionDefinition } from '../../core/types/content.js';
export interface HazardCycle { hazardIndex:number; nextAt:number; activeUntil:number; telegraphUntil:number; }
export interface HazardEvent { hazard:RegionDefinition['hazards'][number]; phase:'idle'|'telegraph'|'active'; remainingMs:number; }
export function createHazardCycle(startAt=0):HazardCycle { return {hazardIndex:0,nextAt:startAt+6500,activeUntil:0,telegraphUntil:0}; }
export function stepRegionHazard(region:RegionDefinition,cycle:HazardCycle,now:number):{cycle:HazardCycle;event:HazardEvent} {
  const hazard=region.hazards[cycle.hazardIndex%region.hazards.length]!;
  let next={...cycle};
  if(now>=cycle.nextAt&&cycle.activeUntil===0)next={...cycle,telegraphUntil:now+hazard.telegraphMs,activeUntil:now+hazard.telegraphMs+2200};
  const phase:HazardEvent['phase']=now<next.telegraphUntil?'telegraph':now<next.activeUntil?'active':'idle';
  if(next.activeUntil>0&&now>=next.activeUntil)next={hazardIndex:(next.hazardIndex+1)%region.hazards.length,nextAt:now+6500,activeUntil:0,telegraphUntil:0};
  return {cycle:next,event:{hazard,phase,remainingMs:Math.max(0,(phase==='telegraph'?next.telegraphUntil:next.activeUntil)-now)}};
}
