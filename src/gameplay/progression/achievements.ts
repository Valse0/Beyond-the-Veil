import { ACHIEVEMENTS,type AchievementMetric,type AchievementReward } from '../../data/achievements.js';
import type { CollectionId } from '../../data/collections.js';
export interface AchievementCollections{achievementProgress:Record<string,number>;completedAchievementIds:string[];achievementPlayedCharacterIds:string[];achievementExploredRegionIds:string[];completedCollectionIds:CollectionId[];unlockedCollectionRewardIds:string[];unlockedCosmeticIds:string[];relicIds:string[];unlockedWeaponVariantIds:string[]}
export interface AchievementRunInput{kills:number;won:boolean;characterId:string;regionId:string;explorationEventsCompleted:number;completedCollectionIds?:readonly CollectionId[]}
export function createInitialAchievementState(){return{achievementProgress:{},completedAchievementIds:[],achievementPlayedCharacterIds:[],achievementExploredRegionIds:[]};}
function safeCount(value:number):number{return Number.isFinite(value)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(value))):0;}
function grantReward(collections:AchievementCollections,reward:AchievementReward):void{
if(reward.kind==='cosmetic'&&!collections.unlockedCosmeticIds.includes(reward.id))collections.unlockedCosmeticIds.push(reward.id);
if(reward.kind==='relic'&&!collections.relicIds.includes(reward.id))collections.relicIds.push(reward.id);
if(reward.kind==='weapon-variant'&&!collections.unlockedWeaponVariantIds.includes(reward.id))collections.unlockedWeaponVariantIds.push(reward.id);
if(reward.kind==='collection-reward'&&!collections.unlockedCollectionRewardIds.includes(reward.id))collections.unlockedCollectionRewardIds.push(reward.id);
}
export function applyAchievementRunProgress<T extends AchievementCollections>(collections:T,run:AchievementRunInput):T{
const next:AchievementCollections={...collections,achievementProgress:{...collections.achievementProgress},completedAchievementIds:[...collections.completedAchievementIds],achievementPlayedCharacterIds:[...collections.achievementPlayedCharacterIds],achievementExploredRegionIds:[...collections.achievementExploredRegionIds],completedCollectionIds:[...collections.completedCollectionIds],unlockedCollectionRewardIds:[...collections.unlockedCollectionRewardIds],unlockedCosmeticIds:[...collections.unlockedCosmeticIds],relicIds:[...collections.relicIds],unlockedWeaponVariantIds:[...collections.unlockedWeaponVariantIds]};
const add=(metric:AchievementMetric,amount:number)=>{next.achievementProgress[metric]=Math.min(Number.MAX_SAFE_INTEGER,(next.achievementProgress[metric]??0)+amount);};
add('runs-completed',1);add('total-kills',safeCount(run.kills));if(run.won)add('boss-victories',1);add('exploration-events',safeCount(run.explorationEventsCompleted));
if(!next.achievementPlayedCharacterIds.includes(run.characterId))next.achievementPlayedCharacterIds.push(run.characterId);if(!next.achievementExploredRegionIds.includes(run.regionId))next.achievementExploredRegionIds.push(run.regionId);
for(const id of run.completedCollectionIds??[])if(!next.completedCollectionIds.includes(id))next.completedCollectionIds.push(id);
next.achievementProgress['unique-characters']=next.achievementPlayedCharacterIds.length;next.achievementProgress['unique-regions']=next.achievementExploredRegionIds.length;next.achievementProgress['completed-collections']=next.completedCollectionIds.length;
const completed=new Set(next.completedAchievementIds);for(const item of ACHIEVEMENTS){if(completed.has(item.id))continue;const conditionMet=item.collectionId?next.completedCollectionIds.includes(item.collectionId as CollectionId):(next.achievementProgress[item.metric]??0)>=item.target;if(!conditionMet)continue;completed.add(item.id);grantReward(next,item.reward);}next.completedAchievementIds=[...completed];return next as T;
}
