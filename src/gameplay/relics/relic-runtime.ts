import { RELICS } from '../../data/relics.js';
import type { RelicDefinition, RelicEffect, RelicStat } from '../../data/relics.js';
import type { ElementId } from '../../core/types/content.js';
export interface RelicStats {damageMultiplier:number;attackSpeedMultiplier:number;maxHealthBonus:number;armorBonus:number;moveSpeedMultiplier:number;elementalBuildupMultiplier:number;criticalChanceBonus:number;lifestealBonus:number;abilityCooldownMultiplier:number;magnetRadiusBonus:number}
const EMPTY:RelicStats={damageMultiplier:1,attackSpeedMultiplier:1,maxHealthBonus:0,armorBonus:0,moveSpeedMultiplier:1,elementalBuildupMultiplier:1,criticalChanceBonus:0,lifestealBonus:0,abilityCooldownMultiplier:1,magnetRadiusBonus:0};
const BY_ID=new Map(RELICS.map(relic=>[relic.id,relic]));
function uniqueKnown(ids:readonly string[]):RelicDefinition[]{const seen=new Set<string>();const out:RelicDefinition[]=[];for(const id of ids){const relic=BY_ID.get(id);if(relic&&!seen.has(id)){seen.add(id);out.push(relic);}}return out;}
function apply(stats:RelicStats,effect:RelicEffect):void{if(effect.element)return;const key=effect.stat as keyof RelicStats;(stats[key] as number)+=effect.value;}
export function deriveRelicStats(ids:readonly string[],characterId:string):RelicStats{
 const relics=uniqueKnown(ids),stats={...EMPTY};
 for(const relic of relics){apply(stats,relic.effect);if(relic.characterSynergy.characterId===characterId)apply(stats,relic.characterSynergy.effect);}
 const sets=new Map<string,RelicDefinition[]>();for(const relic of relics){const group=sets.get(relic.setId)??[];group.push(relic);sets.set(relic.setId,group);}
 for(const group of sets.values()){const bonus=group[0]!.setBonus;if(group.length>=bonus.requiredCount)(stats[bonus.stat] as number)+=bonus.value;}
 stats.damageMultiplier=Math.max(.5,stats.damageMultiplier);stats.attackSpeedMultiplier=Math.max(.5,stats.attackSpeedMultiplier);stats.moveSpeedMultiplier=Math.max(.5,stats.moveSpeedMultiplier);stats.elementalBuildupMultiplier=Math.max(.5,stats.elementalBuildupMultiplier);stats.abilityCooldownMultiplier=Math.max(.5,Math.min(1.5,stats.abilityCooldownMultiplier));
 return stats;
}
export function getRelicDamageMultiplier(ids:readonly string[],characterId:string,element:ElementId):number{
 let multiplier=1;for(const relic of uniqueKnown(ids)){if(relic.effect.stat==='damageMultiplier'&&relic.effect.element===element)multiplier+=relic.effect.value;const affinity=relic.characterSynergy;if(affinity.characterId===characterId&&affinity.effect.stat==='damageMultiplier'&&affinity.effect.element===element)multiplier+=affinity.effect.value;}return multiplier;
}
export function equipRelic(owned:readonly string[],equipped:readonly string[],id:string,slot?:number):string[]|null{
 if(!BY_ID.has(id)||!owned.includes(id)||equipped.includes(id)||equipped.length>3)return null;
 if(slot===undefined)return equipped.length>=3?null:[...equipped,id];
 if(!Number.isInteger(slot)||slot<0||slot>2||slot>equipped.length)return null;
 const next=[...equipped];if(slot===next.length)next.push(id);else next[slot]=id;return next;
}
export function unequipRelic(equipped:readonly string[],id:string):string[]{return equipped.filter(item=>item!==id);}
export function getRelicDefinition(id:string):RelicDefinition|undefined{return BY_ID.get(id);}
export function isRelicStat(value:string):value is RelicStat{return value in EMPTY;}
