import type { BossDefinition, BossPhase } from '../../core/types/content.js';
export interface BossEncounterState { bossId:string; health:number; maxHealth:number; phaseIndex:number; attackReadyAt:Record<string,number>; defeated:boolean; phaseChangedAt:number; }
export interface BossPhaseTransition { state:BossEncounterState; previous?:BossPhase; current:BossPhase; changed:boolean; }
export function createBossEncounter(boss:BossDefinition):BossEncounterState {
  return {bossId:boss.id,health:boss.health,maxHealth:boss.health,phaseIndex:0,attackReadyAt:{},defeated:false,phaseChangedAt:0};
}
export function damageBoss(state:BossEncounterState,boss:BossDefinition,damage:number,now:number):BossPhaseTransition {
  const next={...state,health:Math.max(0,state.health-Math.max(0,damage)),attackReadyAt:{...state.attackReadyAt},defeated:state.health-Math.max(0,damage)<=0};
  const ratio=next.health/next.maxHealth;
  let phaseIndex=0;
  for(let i=0;i<boss.phases.length;i++)if(ratio<=boss.phases[i]!.healthThreshold)phaseIndex=i;
  const changed=phaseIndex!==state.phaseIndex;
  const previous=boss.phases[state.phaseIndex];
  next.phaseIndex=phaseIndex;if(changed)next.phaseChangedAt=now;
  return {state:next,previous,current:boss.phases[phaseIndex]!,changed};
}
export function getBossAttack(state:BossEncounterState,phase:BossPhase,now:number):{state:BossEncounterState;attack:BossPhase['attacks'][number]|undefined} {
  const attack=phase.attacks.find(a=>now>=(state.attackReadyAt[a.id]??0));
  if(!attack)return {state,attack:undefined};
  return {state:{...state,attackReadyAt:{...state.attackReadyAt,[attack.id]:now+attack.cooldownMs}},attack};
}
