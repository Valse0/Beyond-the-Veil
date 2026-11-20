import type { ElementId, EnemyDefinition, PassiveDefinition, WeaponDefinition } from '../../core/types/content.js';
import type { BuildState } from '../weapons/build-runtime.js';
export type EnemyAdaptationTactic='spread'|'strafe'|null;
export interface EnemyAdaptationProfile{dominantElement:ElementId|null;tactic:EnemyAdaptationTactic;areaScore:number;precisionScore:number;}
export const EMPTY_ENEMY_ADAPTATION_PROFILE:EnemyAdaptationProfile={dominantElement:null,tactic:null,areaScore:0,precisionScore:0};
const AREA_BEHAVIORS=new Set(['area-seed','delayed-mortar','delayed-sigil','orbiting-blades','defensive-pulse']);
const PRECISION_BEHAVIORS=new Set(['piercing-thrust','homing-projectile']);
const AREA_SPECIALS=new Set(['fire-explosion','poison-spores','lightning-field','crown-weaken']);
const PRECISION_SPECIALS=new Set(['critical-curse','ice-shatter']);
const SPREAD_BEHAVIORS=new Set(['pursue','swarm','volatile-bomber','wraith','frost-hunt']);
const STRAFE_BEHAVIORS=new Set(['pursue','swarm','volatile-bomber','wraith','frost-hunt']);
export function deriveEnemyAdaptationProfile(build:BuildState,weapons:readonly WeaponDefinition[],passives:readonly PassiveDefinition[]):EnemyAdaptationProfile{
 const counts=new Map<ElementId,number>();let areaScore=0,precisionScore=0;
 for(const progress of build.weapons){
  const weapon=weapons.find(item=>item.id===progress.weaponId);if(!weapon)continue;
  counts.set(weapon.element,(counts.get(weapon.element)??0)+1);
  if(progress.branchId?.endsWith('-branch-spread'))areaScore+=2;
  else if(progress.branchId?.endsWith('-branch-focus'))precisionScore+=2;
  else{const behavior=progress.evolved?(weapon.evolution.branchPaths.find(path=>path.branchId===progress.branchId)?.behaviorChange??weapon.evolution.defaultBehavior):weapon.behavior;if(AREA_BEHAVIORS.has(behavior))areaScore++;if(PRECISION_BEHAVIORS.has(behavior))precisionScore++;}
 }
 for(const progress of build.passives){if(!progress.special)continue;const passive=passives.find(item=>item.id===progress.passiveId);if(!passive)continue;const kind=passive.specialUpgrade.mechanic.kind;if(AREA_SPECIALS.has(kind))areaScore++;if(PRECISION_SPECIALS.has(kind))precisionScore++;}
 const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
 const dominantElement=ranked[0]&&ranked[0][1]>=2&&(!ranked[1]||ranked[0][1]>ranked[1][1])?ranked[0][0]:null;
 const tactic:EnemyAdaptationTactic=areaScore>=2&&areaScore>precisionScore?'spread':precisionScore>=2&&precisionScore>areaScore?'strafe':null;
 return{dominantElement,tactic,areaScore,precisionScore};
}
export interface EnemyAdaptationEligibility{isBoss?:boolean;isElite?:boolean;isSummoned?:boolean;hasRegularSpawnIndex?:boolean;}
export function isEnemyAdaptationEligible(flags:EnemyAdaptationEligibility):boolean{return flags.hasRegularSpawnIndex===true&&flags.isBoss!==true&&flags.isElite!==true&&flags.isSummoned!==true;}
export interface EnemyElementAdaptationState{trackedElement:ElementId|null;hitCount:number;windowStartedAt:number;shieldElement:ElementId|null;shieldUntil:number;cooldownUntil:number;}
export const EMPTY_ENEMY_ADAPTATION_STATE:EnemyElementAdaptationState={trackedElement:null,hitCount:0,windowStartedAt:0,shieldElement:null,shieldUntil:0,cooldownUntil:0};
export const ENEMY_ADAPTATION_HIT_WINDOW_MS=4_000;
export const ENEMY_ADAPTATION_REQUIRED_HITS=3;
export const ENEMY_ADAPTATION_SHIELD_DURATION_MS=2_500;
export const ENEMY_ADAPTATION_COOLDOWN_MS=10_000;
export const ENEMY_ADAPTATION_DAMAGE_MULTIPLIER=.85;
export function recordEnemyAdaptationElementHit(state:EnemyElementAdaptationState,element:ElementId,dominantElement:ElementId|null,now:number):{state:EnemyElementAdaptationState;activated:boolean}{
 if(!dominantElement||element!==dominantElement||now<state.cooldownUntil)return{state,activated:false};
 const withinWindow=state.trackedElement===element&&now-state.windowStartedAt<=ENEMY_ADAPTATION_HIT_WINDOW_MS,hitCount=withinWindow?state.hitCount+1:1;
 if(hitCount<ENEMY_ADAPTATION_REQUIRED_HITS)return{state:{...state,trackedElement:element,hitCount,windowStartedAt:withinWindow?state.windowStartedAt:now},activated:false};
 return{state:{trackedElement:null,hitCount:0,windowStartedAt:0,shieldElement:element,shieldUntil:now+ENEMY_ADAPTATION_SHIELD_DURATION_MS,cooldownUntil:now+ENEMY_ADAPTATION_COOLDOWN_MS},activated:true};
}
export function getEnemyAdaptationDamageMultiplier(state:EnemyElementAdaptationState,element:ElementId|undefined,now:number):number{return element&&state.shieldElement===element&&state.shieldUntil>now ? .85 : 1;}
export interface EnemyAdaptationPoint{x:number;y:number;}
export interface EnemyAdaptationVelocity{velocityX:number;velocityY:number;mode:EnemyAdaptationTactic;}
/** Changes heading only; the enemy's current movement speed is preserved. */
export function resolveEnemyAdaptationVelocity(definition:EnemyDefinition,velocity:EnemyAdaptationPoint,actor:EnemyAdaptationPoint,target:EnemyAdaptationPoint,nearbyAllies:readonly EnemyAdaptationPoint[],tactic:EnemyAdaptationTactic,sideSign=1):EnemyAdaptationVelocity{
 const speed=Math.hypot(velocity.x,velocity.y);if(!tactic||speed<=.001)return{velocityX:velocity.x,velocityY:velocity.y,mode:null};
 const baseX=velocity.x/speed,baseY=velocity.y/speed;
 if(tactic==='spread'&&SPREAD_BEHAVIORS.has(definition.behavior)){
  let awayX=0,awayY=0;for(const ally of nearbyAllies){const dx=actor.x-ally.x,dy=actor.y-ally.y,distance=Math.hypot(dx,dy);if(distance<=.001||distance>=132)continue;const weight=(132-distance)/132;awayX+=dx/distance*weight;awayY+=dy/distance*weight;}
  const length=Math.hypot(awayX,awayY);if(length<=.001)return{velocityX:velocity.x,velocityY:velocity.y,mode:null};
  const x=baseX+awayX/length*.75,y=baseY+awayY/length*.75,n=Math.hypot(x,y)||1;return{velocityX:x/n*speed,velocityY:y/n*speed,mode:'spread'};
 }
 if(tactic==='strafe'&&STRAFE_BEHAVIORS.has(definition.behavior)){
  const dx=target.x-actor.x,dy=target.y-actor.y,distance=Math.hypot(dx,dy);if(distance<120||distance>360)return{velocityX:velocity.x,velocityY:velocity.y,mode:null};
  const sign=sideSign<0?-1:1,x=baseX-dy/distance*sign*.42,y=baseY+dx/distance*sign*.42,n=Math.hypot(x,y)||1;return{velocityX:x/n*speed,velocityY:y/n*speed,mode:'strafe'};
 }
 return{velocityX:velocity.x,velocityY:velocity.y,mode:null};
}
