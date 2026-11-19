import type { RegionId } from '../core/types/content.js';
import { COLLECTIONS } from './collections.js';
export type AchievementMetric='runs-completed'|'total-kills'|'boss-victories'|'exploration-events'|'unique-characters'|'unique-regions'|'completed-collections';
export type AchievementReward={kind:'cosmetic';id:string}|{kind:'relic';id:string}|{kind:'weapon-variant';id:string}|{kind:'collection-reward';id:string};
export interface AchievementDefinition{id:string;name:string;description:string;metric:AchievementMetric;target:number;reward:AchievementReward;collectionId?:string}
export const ACHIEVEMENTS:readonly AchievementDefinition[]=[
{id:'first-descent',name:'İlk Adım',description:'İlk koşunu tamamla.',metric:'runs-completed',target:1,reward:{kind:'cosmetic',id:'ashen-hunter'}},
{id:'seasoned-hunter',name:'Tecrübeli Avcı',description:'10 koşuyu tamamla.',metric:'runs-completed',target:10,reward:{kind:'cosmetic',id:'iron-oath'}},
{id:'relentless-hunter',name:'Bitmeyen Av',description:'25 koşuyu tamamla.',metric:'runs-completed',target:25,reward:{kind:'cosmetic',id:'astral-mantle'}},
{id:'first-blood',name:'İlk Kan',description:'100 düşman yen.',metric:'total-kills',target:100,reward:{kind:'relic',id:'forest-heart'}},
{id:'exterminator',name:'İmha Uzmanı',description:'500 düşman yen.',metric:'total-kills',target:500,reward:{kind:'weapon-variant',id:'gravecleaver-ossuary-variant'}},
{id:'army-breaker',name:'Ordu Kıran',description:'1.000 düşman yen.',metric:'total-kills',target:1000,reward:{kind:'weapon-variant',id:'briar-seed-verdant-variant'}},
{id:'boss-slayer',name:'Mühür Kıran',description:'İlk bossunu yen.',metric:'boss-victories',target:1,reward:{kind:'relic',id:'king-crown-shard'}},
{id:'boss-hunter',name:'Boss Avcısı',description:'5 boss yen.',metric:'boss-victories',target:5,reward:{kind:'weapon-variant',id:'rune-mortar-forge-variant'}},
{id:'boss-legend',name:'Efsane Avcı',description:'10 boss yen.',metric:'boss-victories',target:10,reward:{kind:'weapon-variant',id:'blood-loom-mire-variant'}},
{id:'curious-soul',name:'Meraklı Ruh',description:'3 koşu etkinliğini tamamla.',metric:'exploration-events',target:3,reward:{kind:'relic',id:'grave-lament'}},
{id:'pathfinder',name:'Yol Bulucu',description:'10 koşu etkinliğini tamamla.',metric:'exploration-events',target:10,reward:{kind:'weapon-variant',id:'eclipse-sigil-veil-variant'}},
{id:'veil-walker',name:'Perde Gezgini',description:'5 farklı bölgede koşu tamamla.',metric:'unique-regions',target:5,reward:{kind:'cosmetic',id:'night-veil'}},
{id:'all-hunters',name:'Beş Yemin',description:'5 farklı avcıyla koşu tamamla.',metric:'unique-characters',target:5,reward:{kind:'cosmetic',id:'scarlet-regalia'}},
...COLLECTIONS.map(collection=>({id:collection.achievementId,name:collection.name+' Tamamlandı',description:collection.description,metric:'completed-collections' as const,target:1,reward:{kind:'collection-reward' as const,id:collection.rewardId},collectionId:collection.id})),
{id:'grand-collector',name:'Perde Arşivcisi',description:'Altı koleksiyonun tamamını bitir.',metric:'completed-collections',target:6,reward:{kind:'collection-reward',id:'veil-archivist-regalia'}}
] as const;
export const ACHIEVEMENT_IDS=new Set(ACHIEVEMENTS.map(item=>item.id));
export const ACHIEVEMENT_METRICS:readonly AchievementMetric[]=['runs-completed','total-kills','boss-victories','exploration-events','unique-characters','unique-regions','completed-collections'];
export function isAchievementProgressRecord(value:unknown):value is Record<string,number>{if(typeof value!=='object'||value===null||Array.isArray(value))return false;return Object.entries(value).every(([key,n])=>ACHIEVEMENT_METRICS.includes(key as AchievementMetric)&&typeof n==='number'&&Number.isSafeInteger(n)&&n>=0);}
export function isAchievementIdArray(value:unknown):value is string[]{return Array.isArray(value)&&value.every(id=>typeof id==='string'&&ACHIEVEMENT_IDS.has(id))&&new Set(value).size===value.length;}
export function isAchievementCharacterIdArray(value:unknown):value is string[]{return Array.isArray(value)&&value.every(id=>typeof id==='string'&&['cursed-hunter','black-knight','spirit-mage','shadow-assassin','blood-priestess'].includes(id))&&new Set(value).size===value.length;}
export function isAchievementRegionIdArray(value:unknown):value is string[]{const ids:readonly RegionId[]=['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];return Array.isArray(value)&&value.every(id=>typeof id==='string'&&ids.includes(id as RegionId))&&new Set(value).size===value.length;}
