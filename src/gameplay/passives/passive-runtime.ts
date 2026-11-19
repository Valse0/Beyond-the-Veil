import type {PassiveDefinition,PassiveSpecialMechanic} from '../../core/types/content.js';
import type {BuildState} from '../weapons/build-runtime.js';

export interface PassiveSpecialRuntimeState {
  cooldowns:Record<string,number>;
  used:string[];
  freeRerollUsed:boolean;
  sealedPlateReadyAt:number;
}
export const createPassiveSpecialRuntimeState=():PassiveSpecialRuntimeState=>({cooldowns:{},used:[],freeRerollUsed:false,sealedPlateReadyAt:30000});

export function isPassiveSpecialActive(build:BuildState,passiveId:string):boolean {
  return build.passives.some(item=>item.passiveId===passiveId&&item.level>=5&&item.special);
}
export function getActivePassiveMechanics(build:BuildState,passives:readonly PassiveDefinition[]):PassiveSpecialMechanic[] {
  return build.passives.filter(item=>item.level>=5&&item.special).map(item=>passives.find(def=>def.id===item.passiveId)?.specialUpgrade.mechanic).filter((value):value is PassiveSpecialMechanic=>Boolean(value));
}
export function tryPassiveCooldown(state:PassiveSpecialRuntimeState,key:string,now:number,cooldownMs:number):{state:PassiveSpecialRuntimeState;triggered:boolean} {
  if(now<(state.cooldowns[key]??0))return {state,triggered:false};
  return {state:{...state,cooldowns:{...state.cooldowns,[key]:now+Math.max(0,cooldownMs)}},triggered:true};
}
export function resolveSealedPlate(state:PassiveSpecialRuntimeState,now:number,active:boolean,intervalMs:number):{state:PassiveSpecialRuntimeState;blocked:boolean} {
  if(!active||now<state.sealedPlateReadyAt)return {state,blocked:false};
  return {state:{...state,sealedPlateReadyAt:now+intervalMs},blocked:true};
}
export function resolveLastWard(health:number,incomingDamage:number,used:boolean,active:boolean,healthRemaining:number):{health:number;used:boolean;triggered:boolean} {
  if(!active||used||health-incomingDamage>0)return {health:Math.max(0,health-incomingDamage),used,triggered:false};
  return {health:Math.max(1,healthRemaining),used:true,triggered:true};
}
export function getLowHealthLifestealBonus(health:number,maxHealth:number,mechanic:Extract<PassiveSpecialMechanic,{kind:'low-health-lifesteal'}>|undefined):number {
  return mechanic&&maxHealth>0&&health/maxHealth<=mechanic.healthThreshold?mechanic.bonus:0;
}
export function addCurseStack(stacks:number,bonusStacks:number,maxStacks=3):number {
  return Math.min(maxStacks,Math.max(0,stacks)+Math.max(0,bonusStacks));
}
export function isFrozenTarget(expiresAt:number|undefined,now:number):boolean {
  return typeof expiresAt==='number'&&expiresAt>now;
}
export function isPoisonBloomReady(stacks:number,maximumStacks:number):boolean {
  return maximumStacks>0&&stacks>=maximumStacks;
}
export function resolveCriticalHit(baseDamage:number,chance:number,random:number,multiplier:number):{damage:number;critical:boolean} {
  const critical=Number.isFinite(random)&&random>=0&&random<Math.max(0,Math.min(1,chance));
  return {damage:Math.max(0,baseDamage)*(critical?Math.max(1,multiplier):1),critical};
}
export function getWeakenedDamageMultiplier(weakenedUntil:number,now:number,multiplier:number):number {
  return weakenedUntil>now?Math.max(0,Math.min(1,multiplier)):1;
}
export function grantFreeReroll(state:PassiveSpecialRuntimeState,active:boolean):{state:PassiveSpecialRuntimeState;free:boolean} {
  if(!active||state.freeRerollUsed)return {state,free:false};
  return {state:{...state,freeRerollUsed:true},free:true};
}
