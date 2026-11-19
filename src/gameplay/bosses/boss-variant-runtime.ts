import type { BossDefinition, BossEncounterVariantDefinition } from '../../core/types/content.js';
import { BOSS_VARIANTS } from '../../data/boss-variants.js';

export interface BossVariantResolution {
  boss:BossDefinition;
  variantId:string|null;
  variantName:string|null;
}
export function resolveBossVariant(boss:BossDefinition,unlockedEncounterIds:readonly string[],variants:readonly BossEncounterVariantDefinition[]=BOSS_VARIANTS):BossVariantResolution {
  const selected=[...unlockedEncounterIds].reverse().map(id=>variants.find(item=>item.id===id&&item.bossId===boss.id)).find((item):item is BossEncounterVariantDefinition=>Boolean(item));
  if(!selected)return {boss,variantId:null,variantName:null};
  const phases=boss.phases.map((base,index)=>{
    const override=selected.phases[index];
    return override?{...base,...override,healthThreshold:base.healthThreshold,attacks:override.attacks.map(attack=>({...attack,telegraph:{...attack.telegraph}})),addEnemyIds:[...override.addEnemyIds]}:base;
  });
  return {boss:{...boss,phases},variantId:selected.id,variantName:selected.name};
}
