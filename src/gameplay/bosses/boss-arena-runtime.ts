import type { ElementId } from '../../core/types/content.js';

export type BossArenaObjectKind='root-pillar'|'grave-marker'|'gear'|'water-island'|'seal';
export interface BossArenaObjectState {
  id:string;kind:BossArenaObjectKind;health:number;maxHealth:number;active:boolean;
  elementCounter?:ElementId;disabledUntil:number;revealed:boolean;isTrue:boolean;safe:boolean;
}
export interface BossArenaState { bossId:string;phaseIndex:number;objects:BossArenaObjectState[];lastHealingAt:number }
export interface BossArenaObjectHit {
  state:BossArenaState;appliedDamage:number;changed:boolean;destroyed:boolean;resisted:boolean;
  revealedObjectId?:string;disabledUntil?:number;
}
export interface BossArenaTick { state:BossArenaState;healing:number }

const objects=(kind:BossArenaObjectKind,count:number,health:number,counter?:ElementId,seed=0):BossArenaObjectState[]=>
  Array.from({length:count},(_,index)=>({
    id:`${kind}-${index+1}`,kind,health,maxHealth:health,active:true,
    ...(counter?{elementCounter:counter}:{}),disabledUntil:0,revealed:false,
    isTrue:kind==='seal'&&index===((seed>>>0)%count),safe:false
  }));

export function createBossArena(bossId:string,seed=1):BossArenaState {
  let arenaObjects:BossArenaObjectState[];
  switch(bossId){
    case 'thorn-matriarch':arenaObjects=objects('root-pillar',3,240,'fire',seed);break;
    case 'ossuary-king':arenaObjects=objects('grave-marker',4,220,'lightning',seed);break;
    case 'furnace-colossus':arenaObjects=objects('gear',4,180,'ice',seed);break;
    case 'mire-oracle':arenaObjects=objects('water-island',3,0,undefined,seed);break;
    case 'unwritten-regent':arenaObjects=objects('seal',4,200,'dark',seed);break;
    default:throw new Error('Unknown boss arena: '+bossId);
  }
  return transitionBossArenaPhase({bossId,phaseIndex:0,objects:arenaObjects,lastHealingAt:0},0);
}

export function transitionBossArenaPhase(state:BossArenaState,phaseIndex:number):BossArenaState {
  const nextPhase=Math.max(0,Math.min(2,Math.floor(phaseIndex)));
  return {...state,phaseIndex:nextPhase,objects:state.objects.map(object=>({
    ...object,safe:object.kind==='water-island'&&Number(object.id.slice(object.id.lastIndexOf('-')+1))-1===nextPhase
  }))};
}

export function damageBossArenaObject(state:BossArenaState,objectId:string,damage:number,element:ElementId|undefined,now:number):BossArenaObjectHit {
  const target=state.objects.find(object=>object.id===objectId);
  if(!target||!target.active||target.kind==='water-island'||!Number.isFinite(damage)||damage<=0)
    return {state,appliedDamage:0,changed:false,destroyed:false,resisted:true};
  if(target.kind==='seal'&&!target.revealed){
    if(element!=='dark')return {state,appliedDamage:0,changed:false,destroyed:false,resisted:true};
    const real=state.objects.find(object=>object.kind==='seal'&&object.isTrue);
    if(!real)return {state,appliedDamage:0,changed:false,destroyed:false,resisted:true};
    const next={...state,objects:state.objects.map(object=>object.kind==='seal'?{...object,revealed:object.isTrue,active:object.isTrue}:object)};
    return {state:next,appliedDamage:0,changed:true,destroyed:false,resisted:false,revealedObjectId:real.id};
  }
  if(target.kind==='gear'){
    if(element!=='ice')return {state,appliedDamage:0,changed:false,destroyed:false,resisted:true};
    const disabledUntil=now+10_000-state.phaseIndex*2_000;
    return {state:{...state,objects:state.objects.map(object=>object.id===objectId?{...object,disabledUntil}:object)},appliedDamage:0,changed:true,destroyed:false,resisted:false,disabledUntil};
  }
  if(target.kind==='seal'&&target.isTrue&&element!=='spirit'&&element!=='blood')
    return {state,appliedDamage:0,changed:false,destroyed:false,resisted:true};
  const multiplier=target.elementCounter===element?1.8:1;
  const appliedDamage=Math.max(1,Math.round(damage*multiplier));
  const health=Math.max(0,target.health-appliedDamage),destroyed=health===0;
  return {state:{...state,objects:state.objects.map(object=>object.id===objectId?{...object,health,active:!destroyed}:object)},appliedDamage:target.health-health,changed:true,destroyed,resisted:false};
}

export function getBossArenaDamageMultiplier(state:BossArenaState|undefined,now:number):number {
  if(!state)return 1;
  if(state.bossId==='thorn-matriarch'){
    const active=state.objects.filter(object=>object.kind==='root-pillar'&&object.active).length;
    return 1-(active/3)*(.2+state.phaseIndex*.05);
  }
  if(state.bossId==='furnace-colossus'){
    const stopped=state.objects.filter(object=>object.kind==='gear'&&(!object.active||object.disabledUntil>now)).length;
    return stopped===4?1.25:1;
  }
  if(state.bossId==='unwritten-regent'){
    const real=state.objects.find(object=>object.kind==='seal'&&object.isTrue);
    return real&&!real.active?1.25:.8-state.phaseIndex*.1;
  }
  return 1;
}

export function stepBossArena(state:BossArenaState,now:number,bossMaxHealth:number):BossArenaTick {
  if(state.bossId!=='ossuary-king'||now-state.lastHealingAt<3_000)return {state,healing:0};
  const activeMarkers=state.objects.filter(object=>object.kind==='grave-marker'&&object.active).length;
  if(activeMarkers===0)return {state:{...state,lastHealingAt:now},healing:0};
  return {state:{...state,lastHealingAt:now},healing:Math.max(0,bossMaxHealth*(.006+state.phaseIndex*.002)*activeMarkers)};
}

export function getSafeBossArenaObject(state:BossArenaState|undefined):BossArenaObjectState|undefined {
  return state?.objects.find(object=>object.kind==='water-island'&&object.active&&object.safe);
}
