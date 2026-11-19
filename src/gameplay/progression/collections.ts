import { COLLECTIONS,type CollectionId } from '../../data/collections.js';

export interface CollectionProgressState {
  discoveredEnemyIds:string[];
  discoveredWeaponIds:string[];
  discoveredLoreIds:string[];
  discoveredCharacterBioIds:string[];
  relicIds:string[];
  unlockedMasteryRewardIds:string[];
  completedCollectionIds:CollectionId[];
  unlockedCollectionRewardIds:string[];
}
export interface CollectionDiscoveryInput {
  enemyIds?:readonly string[];
  weaponIds?:readonly string[];
  loreIds?:readonly string[];
  characterBioIds?:readonly string[];
}
export type CollectionProgressSnapshot={id:CollectionId;name:string;discovered:number;total:number;completed:boolean};

function mergeKnown(current:readonly string[],incoming:readonly string[]|undefined,valid:ReadonlySet<string>):string[]{
  const next=new Set(current.filter(id=>valid.has(id)));
  for(const id of incoming??[])if(valid.has(id))next.add(id);
  return [...next];
}
export function getCollectionProgress(state:CollectionProgressState):CollectionProgressSnapshot[]{
  const sources:Record<CollectionId,readonly string[]>={
    bestiary:state.discoveredEnemyIds,
    arsenal:state.discoveredWeaponIds,
    'relic-vault':state.relicIds,
    'story-archive':state.discoveredLoreIds,
    'character-biographies':state.discoveredCharacterBioIds,
    'mastery-attire':state.unlockedMasteryRewardIds
  };
  return COLLECTIONS.map(collection=>{
    const source=new Set(sources[collection.id]);
    const discovered=collection.itemIds.filter(id=>source.has(id)).length;
    return{id:collection.id,name:collection.name,discovered,total:collection.itemIds.length,completed:discovered===collection.itemIds.length};
  });
}
export function applyCollectionProgress<T extends CollectionProgressState>(state:T,input:CollectionDiscoveryInput):T{
  const sources={
    discoveredEnemyIds:mergeKnown(state.discoveredEnemyIds,input.enemyIds,new Set(COLLECTIONS.find(item=>item.id==='bestiary')!.itemIds)),
    discoveredWeaponIds:mergeKnown(state.discoveredWeaponIds,input.weaponIds,new Set(COLLECTIONS.find(item=>item.id==='arsenal')!.itemIds)),
    discoveredLoreIds:[...new Set([...state.discoveredLoreIds,...(input.loreIds??[]).filter(id=>COLLECTIONS.find(item=>item.id==='story-archive')!.itemIds.includes(id))])],
    discoveredCharacterBioIds:mergeKnown(state.discoveredCharacterBioIds,input.characterBioIds,new Set(COLLECTIONS.find(item=>item.id==='character-biographies')!.itemIds))
  };
  const next={...state,...sources,completedCollectionIds:[...state.completedCollectionIds],unlockedCollectionRewardIds:[...state.unlockedCollectionRewardIds]};
  const snapshots=getCollectionProgress(next);
  const completed=new Set(next.completedCollectionIds);
  for(const snapshot of snapshots)if(snapshot.completed)completed.add(snapshot.id);
  next.completedCollectionIds=[...completed];
  return next as T;
}
