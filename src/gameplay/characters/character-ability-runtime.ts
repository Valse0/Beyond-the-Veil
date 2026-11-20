import type { CharacterAbilityEffect } from '../../core/types/content.js';
export interface AbilityPoint { x:number; y:number }
export interface AbilityTarget { id:string; x:number; y:number }
export interface CharacterAbilityContext { origin:AbilityPoint; targets:readonly AbilityTarget[]; range:number; maxHealth:number; currentHealth:number; aim:AbilityPoint }
export interface CharacterAbilityResolution {
  effect:CharacterAbilityEffect; targetIndexes:number[]; knockback:AbilityPoint[];
  guardDurationMs:number; guardDamageMultiplier:number; staggerDurationMs:number;
  delayedZone:{x:number;y:number;radius:number;delayMs:number;visualDurationMs:number}|null;
  blinkDestination:AbilityPoint|null; markedTargetIndex:number|null; markDurationMs:number;
  healthCost:number; lifestealRatio:number;
}
const distance=(a:AbilityPoint,b:AbilityPoint):number=>Math.hypot(b.x-a.x,b.y-a.y);
export function resolveCharacterAbility(effect:CharacterAbilityEffect,context:CharacterAbilityContext):CharacterAbilityResolution {
  const targetIndexes=context.targets.map((target,index)=>({target,index})).filter(({target})=>distance(context.origin,target)<=context.range).map(({index})=>index);
  const result:CharacterAbilityResolution={effect,targetIndexes,knockback:[],guardDurationMs:0,guardDamageMultiplier:1,staggerDurationMs:0,delayedZone:null,blinkDestination:null,markedTargetIndex:null,markDurationMs:0,healthCost:0,lifestealRatio:0};
  if(effect==='radial-knockback'){
    result.knockback=targetIndexes.map(index=>{const target=context.targets[index]!;const length=distance(context.origin,target)||1;return {x:(target.x-context.origin.x)/length*245,y:(target.y-context.origin.y)/length*245};});
  }else if(effect==='guard-and-stagger'){
    result.guardDurationMs=2800;result.guardDamageMultiplier=.35;result.staggerDurationMs=1100;
  }else if(effect==='delayed-spirit-zone'){
    result.delayedZone={x:context.origin.x,y:context.origin.y,radius:context.range,delayMs:650,visualDurationMs:900};
  }else if(effect==='blink-and-mark'){
    const nearest=targetIndexes.map(index=>({index,target:context.targets[index]!,distance:distance(context.origin,context.targets[index]!)})).sort((a,b)=>a.distance-b.distance)[0];
    const aimLength=Math.hypot(context.aim.x,context.aim.y)||1;
    const direction=nearest?{x:(nearest.target.x-context.origin.x)/(nearest.distance||1),y:(nearest.target.y-context.origin.y)/(nearest.distance||1)}:{x:context.aim.x/aimLength,y:context.aim.y/aimLength};
    const travel=Math.min(context.range,nearest?Math.max(48,nearest.distance-62):Math.min(150,context.range));
    result.blinkDestination={x:context.origin.x+direction.x*travel,y:context.origin.y+direction.y*travel};
    if(nearest){result.markedTargetIndex=nearest.index;result.markDurationMs=3200;}
  }else if(effect==='health-sacrifice-lifesteal'){
    result.healthCost=Math.min(Math.max(0,context.currentHealth-1),context.maxHealth*.12);result.lifestealRatio=.35;
  }
  return result;
}