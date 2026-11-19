export type ElementId='fire'|'ice'|'poison'|'dark'|'spirit'|'lightning'|'blood';
export type RegionId='cursed-forest'|'forgotten-graveyard'|'deep-dungeon'|'rotten-swamp'|'cursed-castle';
export type EnemyBehavior='pursue'|'orbit'|'surge'|'rune-guardian'|'flank'|'poison-volley'|'nest-summon'|'shield-advance'|'soul-snipe'|'swarm'|'support-heal'|'leap'|'artillery'|'duelist'|'burrow'|'rune-sapper'|'ambush'|'blood-drain'|'volatile-bomber'|'hex-caster'|'web-control'|'phase-stalk'|'frost-hunt'|'mimic'|'soul-anchor'|'wraith';
export type AssetRole='character'|'enemy'|'boss'|'weapon'|'passive'|'element'|'region'|'relic';
export interface Telegraph { shape:'circle'|'line'|'cone'|'ring'|'cross'|'zone'; warningMs:number; cue:string }
export interface Attack { id:string; name:string; kind:string; damage:number; range:number; cooldownMs:number; telegraph:Telegraph; counter:string }
export interface CharacterDefinition { id:string; name:string; role:string; description:string; health:number; moveSpeed:number; startingWeaponId:string; startingPassiveId:string; activeAbility:string; ability:{id:string;cooldownMs:number;range:number;damageMultiplier:number;effect:string}; stats:{damageMultiplier:number;criticalChance:number;armor:number}; weaponSynergies:string[]; elementSynergies:ElementId[]; mastery:{level:number;rewardId:string;description:string}[]; cosmetics:string[]; story:string; assetId:string }
export interface EnemyDefinition { id:string; name:string; regionId:RegionId; role:string; behavior:EnemyBehavior; health:number; speed:number; contactDamage:number; experience:number; radius:number; color:number; element:ElementId; resistances:Partial<Record<ElementId,number>>; attack:Attack; specialRule:string; mutationSlots:string[]; assetId:string }
export interface BossPhase { id:string; name:string; healthThreshold:number; arenaChange:string; attacks:Attack[]; addEnemyIds:string[]; phaseRule:string }
export interface BossDefinition { id:string; name:string; regionId:RegionId; title:string; health:number; contactDamage:number; arena:{shape:string;feature:string;hazard:string;boundaryRule:string}; phases:BossPhase[]; weakness:ElementId[]; resistance:Partial<Record<ElementId,number>>; reward:{soulEssence:number;relicId:string;unlockId:string}; story:string; musicId:string; assetId:string }
export interface WeaponLevel { level:number;damage:number;intervalMs:number;range:number;projectiles:number;upgrade:string }
export interface WeaponBranchModifiers { damageMultiplier:number;intervalMultiplier:number;rangeMultiplier:number;projectileBonus:number;pierceBonus:number;areaMultiplier:number;chainTargetBonus:number }
export interface WeaponBranch { id:string;name:string;effect:string;modifiers:WeaponBranchModifiers }
export interface WeaponDefinition { id:string;name:string;category:string;description:string;behavior:string;element:ElementId;baseDamage:number;intervalMs:number;range:number;projectileSpeed:number;maxLevel:number;levels:WeaponLevel[];branches:WeaponBranch[];evolution:{id:string;name:string;requiredPassiveId:string;behaviorChange:string};characterSynergies:string[];assetId:string }
export type PassiveSpecialMechanic =
  | {kind:'fire-explosion';radius:number;damageMultiplier:number;cooldownMs:number}
  | {kind:'ice-shatter';minimumHitDamage:number;damageMultiplier:number}
  | {kind:'poison-spores';radius:number;damageMultiplier:number;durationMs:number;tickMs:number;cooldownMs:number}
  | {kind:'critical-curse';bonusStacks:number;criticalMultiplier:number}
  | {kind:'boss-essence';fragmentCount:number;essencePerFragment:number}
  | {kind:'lightning-field';radius:number;damageMultiplier:number;durationMs:number;tickMs:number}
  | {kind:'low-health-lifesteal';healthThreshold:number;bonus:number}
  | {kind:'sealed-plate';intervalMs:number}
  | {kind:'ghost-step';immunityMs:number}
  | {kind:'free-reroll';count:number}
  | {kind:'last-ward';healthRemaining:number}
  | {kind:'crown-weaken';radius:number;damageMultiplier:number;durationMs:number};
export interface PassiveDefinition { id:string;name:string;category:string;description:string;maxLevel:number;element?:ElementId;effects:{level:number;stat:string;value:number;unit:string}[];specialUpgrade:{id:string;name:string;effect:string;mechanic:PassiveSpecialMechanic};transformsWeaponIds:string[];transformsCharacterIds:string[];assetId:string }
export interface ElementDefinition { id:ElementId;name:string;statusName:string;buildupPerHit:number;threshold:number;durationMs:number;resistanceCap:number;statusEffect:string;reactions:{id:string;with:ElementId;name:string;effect:string;damageMultiplier:number;durationMs:number}[];assetId:string }
export interface RegionDefinition { id:RegionId;name:string;subtitle:string;atmosphere:string;palette:string[];enemyIds:string[];bossId:string;hazards:{id:string;name:string;trigger:string;telegraphMs:number;effect:string;counter:string}[];explorationPoints:{id:string;name:string;discovery:string;reward:string}[];elite:{id:string;name:string;behavior:string;reward:string};musicId:string;rewardId:string;storyFragment:string;map:{width:number;height:number;landmarks:number;proceduralSites:number;secretPassages:number};assetId:string }
export interface AssetRecord { id:string;role:AssetRole;contentId:string;path:null;status:'placeholder'|'final'|'blocked';width:number;height:number;anchor:string;filtering:'nearest';requiredStates:string[];source:{kind:string;creator:string;license:string;attribution:string};nativeScaleReviewed:boolean;inEngineReviewed:boolean;technicalChecksPassed:boolean }
