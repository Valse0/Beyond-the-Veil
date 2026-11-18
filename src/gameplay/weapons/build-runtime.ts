import type { PassiveDefinition, WeaponDefinition } from '../../core/types/content.js';
export interface WeaponProgress { weaponId:string; level:number; branchId?:string; evolved:boolean; }
export interface PassiveProgress { passiveId:string; level:number; special:boolean; }
export interface BuildState { weapons:WeaponProgress[]; passives:PassiveProgress[]; }
export interface BuildStats { damageMultiplier:number; attackSpeedMultiplier:number; moveSpeedMultiplier:number; armor:number; criticalChance:number; magnetRadiusBonus:number; xpGainMultiplier:number; lifesteal:number; abilityCooldownMultiplier:number; elementalBuildupMultiplier:number; }
export const EMPTY_BUILD:BuildState={weapons:[],passives:[]};
export function addWeapon(build:BuildState,weapon:WeaponDefinition):BuildState {
  if(build.weapons.some(w=>w.weaponId===weapon.id)||build.weapons.length>=6)return build;
  return {...build,weapons:[...build.weapons,{weaponId:weapon.id,level:1,evolved:false}]};
}
export function addPassive(build:BuildState,passive:PassiveDefinition):BuildState {
  if(build.passives.some(p=>p.passiveId===passive.id)||build.passives.length>=6)return build;
  return {...build,passives:[...build.passives,{passiveId:passive.id,level:1,special:false}]};
}
export function upgradeWeapon(build:BuildState,weapon:WeaponDefinition):BuildState {
  return {...build,weapons:build.weapons.map(w=>w.weaponId===weapon.id?{...w,level:Math.min(weapon.maxLevel,w.level+1)}:w)};
}
export function upgradePassive(build:BuildState,passive:PassiveDefinition):BuildState {
  return {...build,passives:build.passives.map(p=>p.passiveId===passive.id?{...p,level:Math.min(passive.maxLevel,p.level+1)}:p)};
}
export function evolveWeapon(build:BuildState,weapon:WeaponDefinition):BuildState {
  const passive=build.passives.find(p=>p.passiveId===weapon.evolution.requiredPassiveId&&p.level>=5);
  return {...build,weapons:build.weapons.map(w=>w.weaponId===weapon.id&&w.level>=5&&passive?{...w,evolved:true}:w)};
}
export function deriveBuildStats(build:BuildState,passives:readonly PassiveDefinition[]):BuildStats {
  const stats:BuildStats={damageMultiplier:1,attackSpeedMultiplier:1,moveSpeedMultiplier:1,armor:0,criticalChance:0,magnetRadiusBonus:0,xpGainMultiplier:1,lifesteal:0,abilityCooldownMultiplier:1,elementalBuildupMultiplier:1};
  for(const p of build.passives) {
    const def=passives.find(x=>x.id===p.passiveId); const effect=def?.effects.find(x=>x.level===p.level); if(!def||!effect)continue;
    const v=effect.value/100;
    switch(effect.stat) {
      case 'fireDamage': case 'damage': stats.damageMultiplier+=v; break;
      case 'iceBuildup': case 'poisonBuildup': case 'lightningDamage': stats.elementalBuildupMultiplier+=v; break;
      case 'criticalChance': stats.criticalChance+=v; break;
      case 'armor': stats.armor+=effect.value; break;
      case 'moveSpeed': stats.moveSpeedMultiplier+=v; break;
      case 'magnetRadius': stats.magnetRadiusBonus+=effect.value; break;
      case 'xpGain': stats.xpGainMultiplier+=v; break;
      case 'lifesteal': stats.lifesteal+=v; break;
      case 'abilityCooldown': stats.abilityCooldownMultiplier=Math.max(.5,stats.abilityCooldownMultiplier+v); break;
      case 'statusDuration': stats.elementalBuildupMultiplier+=v; break;
    }
  }
  return stats;
}
export function weaponLevelStats(progress:WeaponProgress,definition:WeaponDefinition) {
  const row=definition.levels[Math.max(0,Math.min(definition.levels.length-1,progress.level-1))]!;
  return {...row,behavior:progress.evolved?definition.evolution.behaviorChange:definition.behavior,evolutionName:progress.evolved?definition.evolution.name:undefined};
}
