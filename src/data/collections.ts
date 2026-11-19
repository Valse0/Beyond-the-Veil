import { ENEMIES } from './enemies.js';
import { WEAPONS } from './weapons.js';
import { RELICS } from './relics.js';
import { REGIONS } from './regions.js';
import { CHARACTERS } from './characters.js';

export type CollectionId='bestiary'|'arsenal'|'relic-vault'|'story-archive'|'character-biographies'|'mastery-attire';
export interface CollectionDefinition {
  id:CollectionId;
  name:string;
  description:string;
  itemIds:readonly string[];
  achievementId:string;
  rewardId:string;
  rewardName:string;
}
const masteryCostumeIds=CHARACTERS.flatMap(character=>character.mastery.filter(milestone=>milestone.level===10).map(milestone=>milestone.rewardId));
const regionLoreIds=REGIONS.map(region=>region.explorationPoints.find(point=>point.id.endsWith('-lore'))?.id).filter((id):id is string=>Boolean(id));

export const COLLECTIONS:readonly CollectionDefinition[]=[
  {id:'bestiary',name:'Yaratık Ansiklopedisi',description:'Dünyadaki 25 temel yaratık türünü keşfet.',itemIds:ENEMIES.map(enemy=>enemy.id),achievementId:'collection-bestiary',rewardId:'bestiary-scholar',rewardName:'Yaratık Bilgesi Unvanı'},
  {id:'arsenal',name:'Silah Arşivi',description:'12 temel silahın tamamını savaşta kullan.',itemIds:WEAPONS.map(weapon=>weapon.id),achievementId:'collection-arsenal',rewardId:'arsenal-keeper',rewardName:'Cephanelik Muhafızı Unvanı'},
  {id:'relic-vault',name:'Kalıntı Mahzeni',description:'10 kalıntının tamamını koleksiyonuna kat.',itemIds:RELICS.map(relic=>relic.id),achievementId:'collection-relic-vault',rewardId:'relic-curator',rewardName:'Kalıntı Küratörü Unvanı'},
  {id:'story-archive',name:'Hikâye Arşivi',description:'Beş bölgenin hikâye kaydını tamamla.',itemIds:regionLoreIds,achievementId:'collection-story-archive',rewardId:'lore-keeper',rewardName:'Perde Kâtibi Unvanı'},
  {id:'character-biographies',name:'Avcı Biyografileri',description:'Beş avcının biyografisini keşfet.',itemIds:CHARACTERS.map(character=>character.id),achievementId:'collection-biographies',rewardId:'five-oaths',rewardName:'Beş Yemin Unvanı'},
  {id:'mastery-attire',name:'Ustalık Kostümleri',description:'Beş avcının 10. seviye ustalık kostümünü aç.',itemIds:masteryCostumeIds,achievementId:'collection-mastery-attire',rewardId:'master-of-mastery',rewardName:'Ustalık Üstadı Unvanı'}
] as const;

export const COLLECTION_IDS=new Set(COLLECTIONS.map(collection=>collection.id));
export const COLLECTION_REWARD_IDS=new Set([...COLLECTIONS.map(collection=>collection.rewardId),'veil-archivist-regalia']);
export const COLLECTION_ITEM_IDS:Record<CollectionId,ReadonlySet<string>>=Object.fromEntries(COLLECTIONS.map(collection=>[collection.id,new Set(collection.itemIds)])) as Record<CollectionId,ReadonlySet<string>>;
export function isCollectionIdArray(value:unknown):value is CollectionId[]{return Array.isArray(value)&&value.every(id=>typeof id==='string'&&COLLECTION_IDS.has(id as CollectionId))&&new Set(value).size===value.length;}
export function isCollectionRewardIdArray(value:unknown):value is string[]{return Array.isArray(value)&&value.every(id=>typeof id==='string'&&COLLECTION_REWARD_IDS.has(id))&&new Set(value).size===value.length;}
export function isCollectionItemIdArray(collectionId:CollectionId,value:unknown):value is string[]{const valid=COLLECTION_ITEM_IDS[collectionId];return Array.isArray(value)&&value.every(id=>typeof id==='string'&&valid.has(id))&&new Set(value).size===value.length;}
