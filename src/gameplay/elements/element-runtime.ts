import type { ElementDefinition, ElementId } from '../../core/types/content.js';
export interface ElementStatus { buildup:number; stacks:number; expiresAt:number; nextTickAt:number; stunnedUntil?:number; }
export type ElementState=Partial<Record<ElementId,ElementStatus>>;
export interface ElementHitResult { state:ElementState; damage:number; reaction?:{id:string;name:string;effect:string;damage:number}; triggered:boolean; }
export function applyElementHit(state:ElementState, element:ElementDefinition, baseDamage:number, resistance:number, now:number, catalog:readonly ElementDefinition[]):ElementHitResult {
  const resist=Math.max(-.5,Math.min(element.resistanceCap,resistance));
  const damage=Math.max(0,baseDamage*(1-resist));
  const current=state[element.id]??{buildup:0,stacks:0,expiresAt:0,nextTickAt:now+1000};
  const buildup=current.buildup+element.buildupPerHit;
  const triggered=buildup>=element.threshold;
  const stacks=triggered?Math.min(element.id==='dark'?3:element.id==='blood'||element.id==='poison'?5:1,current.stacks+1):current.stacks;
  const next:ElementState={...state,[element.id]:{buildup:triggered?buildup-element.threshold:buildup,stacks,expiresAt:triggered?now+element.durationMs:Math.max(current.expiresAt,now+element.durationMs),nextTickAt:current.expiresAt>now?current.nextTickAt:now+1000}};
  let reaction:ElementHitResult['reaction'];
  for(const activeId of Object.keys(state) as ElementId[]) {
    if(activeId===element.id) continue;
    const active=state[activeId]; if(!active||active.expiresAt<=now||active.stacks<=0) continue;
    const rule=element.reactions.find(r=>r.with===activeId)||catalog.find(e=>e.id===activeId)?.reactions.find(r=>r.with===element.id);
    if(rule) {
      reaction={id:rule.id,name:rule.name,effect:rule.effect,damage:Math.round(damage*rule.damageMultiplier)};
      next[activeId]={...active,stacks:Math.max(0,active.stacks-1)};
      break;
    }
  }
  return {state:next,damage:Math.round(damage),reaction,triggered};
}
export function tickElementStatuses(state:ElementState, now:number):{state:ElementState;damage:number;slowed:boolean;stunned:boolean} {
  const next:ElementState={}; let damage=0,slowed=false,stunned=false;
  for(const id of Object.keys(state) as ElementId[]) {
    const s=state[id]; if(!s||s.expiresAt<=now) continue;
    next[id]={...s};
    if(now>=s.nextTickAt) {
      if(id==='fire') damage+=2+s.stacks*2;
      if(id==='poison') damage+=s.stacks*2;
      if(id==='blood') damage+=s.stacks*1.5;
      next[id]!.nextTickAt=now+(id==='lightning'?1500:1000);
      if(id==='lightning'&&s.stacks>0)next[id]!.stunnedUntil=now+260;
    }
    if(id==='ice') slowed=true;
    if(id==='lightning'&&s.stacks>0&&(s.stunnedUntil??0)>now)stunned=true;
  }
  return {state:next,damage:Math.round(damage),slowed,stunned};
}
