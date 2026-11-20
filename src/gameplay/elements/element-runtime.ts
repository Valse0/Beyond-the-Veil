import type { ElementDefinition, ElementId, ElementReactionDefinition } from '../../core/types/content.js';

export interface ElementStatus {
  buildup:number;
  stacks:number;
  expiresAt:number;
  nextTickAt:number;
  stunnedUntil?:number;
  frozenUntil?:number;
}
export type ElementState=Partial<Record<ElementId,ElementStatus>>;
export interface ElementReactionResult extends ElementReactionDefinition { damage:number }
export interface ElementHitResult { state:ElementState; damage:number; reaction?:ElementReactionResult; triggered:boolean }
export interface ElementTickResult { state:ElementState;damage:number;slowed:boolean;stunned:boolean;frozen:boolean;damageTakenMultiplier:number }

const maxStacksFor=(id:ElementId):number=>id==='dark'?3:id==='poison'?5:id==='blood'?4:1;

export function applyElementHit(
  state:ElementState,
  element:ElementDefinition,
  baseDamage:number,
  resistance:number,
  now:number,
  catalog:readonly ElementDefinition[],
  damageMultiplier=1
):ElementHitResult {
  const resist=Math.max(-.5,Math.min(element.resistanceCap,resistance));
  const damage=Math.max(0,baseDamage*(1-resist)*Math.max(0,damageMultiplier));
  const current=state[element.id]??{buildup:0,stacks:0,expiresAt:0,nextTickAt:now+1000};
  const buildup=current.buildup+element.buildupPerHit;
  const triggered=buildup>=element.threshold;
  const stacks=triggered?Math.min(maxStacksFor(element.id),current.stacks+1):current.stacks;
  const own:ElementStatus={
    buildup:triggered?buildup-element.threshold:buildup,
    stacks,
    expiresAt:triggered?now+element.durationMs:Math.max(current.expiresAt,now+element.durationMs),
    nextTickAt:current.expiresAt>now?current.nextTickAt:now+1000,
    ...(element.id==='ice'&&triggered?{frozenUntil:now+420}:{}),
    ...(element.id==='lightning'&&triggered?{stunnedUntil:now+260}:{})
  };
  const next:ElementState={...state,[element.id]:own};
  let reaction:ElementReactionResult|undefined;
  const activeEntries=(Object.keys(state) as ElementId[])
    .filter(id=>id!==element.id)
    .map(id=>({id,status:state[id]}))
    .filter((entry):entry is {id:ElementId;status:ElementStatus}=>Boolean(entry.status&&entry.status.expiresAt>now&&entry.status.stacks>0));
  for(const active of activeEntries){
    const rule=element.reactions.find(item=>item.with===active.id)
      ??catalog.find(item=>item.id===active.id)?.reactions.find(item=>item.with===element.id);
    if(!rule)continue;
    reaction={...rule,damage:Math.round(damage*rule.damageMultiplier)};
    const consume=Math.max(1,rule.kind==='rupture'?active.status.stacks:1);
    next[active.id]={...active.status,stacks:Math.max(0,active.status.stacks-consume)};
    if(rule.kind==='rupture')next[element.id]={...own,stacks:Math.max(0,own.stacks-1)};
    break;
  }
  return {state:next,damage:Math.round(damage),reaction,triggered};
}

export function tickElementStatuses(state:ElementState,now:number):ElementTickResult {
  const next:ElementState={};
  let damage=0,slowed=false,stunned=false,frozen=false,poisonStacks=0;
  for(const id of Object.keys(state) as ElementId[]){
    const status=state[id];
    if(!status||status.expiresAt<=now)continue;
    const current={...status};
    if(now>=status.nextTickAt){
      if(id==='fire')damage+=2+status.stacks*2;
      if(id==='poison')damage+=status.stacks*2;
      if(id==='blood')damage+=status.stacks*1.5;
      current.nextTickAt=now+(id==='lightning'?1500:1000);
      if(id==='lightning'&&status.stacks>0)current.stunnedUntil=now+260;
    }
    if(id==='ice'){
      slowed=true;
      frozen=frozen||(current.frozenUntil??0)>now;
    }
    if(id==='lightning'&&status.stacks>0)stunned=stunned||(current.stunnedUntil??0)>now;
    if(id==='poison')poisonStacks=status.stacks;
    next[id]=current;
  }
  return {state:next,damage:Math.round(damage),slowed,stunned,frozen,damageTakenMultiplier:1+poisonStacks*.025};
}
