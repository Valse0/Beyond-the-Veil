import type { RegionPathDefinition } from '../core/types/content.js';

// Only the ten mutually exclusive outcomes of the five main regional quests create
// traversable story passages. Exploration-discovery IDs intentionally live elsewhere.
export const REGION_PATHS: readonly RegionPathDefinition[] = [
  {id:'forest-mercy-path',regionId:'cursed-forest',questId:'forest-root-oath',choiceId:'spare-warden',name:'Bekçinin Sığınağı',description:'Bağışlanan bekçinin koruduğu kök geçidi.',entry:{x:760,y:430},destination:{x:300,y:270}},
  {id:'forest-heartwood-vault',regionId:'cursed-forest',questId:'forest-root-oath',choiceId:'claim-heartwood',name:'Kalp Odunu Mahzeni',description:'Ormanın özüne inen mühürlü mahzen.',entry:{x:1760,y:620},destination:{x:2100,y:300}},
  {id:'grave-silent-gate',regionId:'forgotten-graveyard',questId:'grave-names-unforgotten',choiceId:'release-spirits',name:'Sessiz Ruh Kapısı',description:'Özgür kalan ruhların açtığı mezar geçidi.',entry:{x:650,y:1280},destination:{x:300,y:1530}},
  {id:'grave-bone-choir',regionId:'forgotten-graveyard',questId:'grave-names-unforgotten',choiceId:'bind-the-choir',name:'Kemik Korosu Mahzeni',description:'Zincirlenmiş ruhların saklandığı mahzen.',entry:{x:1770,y:430},destination:{x:2100,y:260}},
  {id:'dungeon-cooling-shaft',regionId:'deep-dungeon',questId:'dungeon-forge-truth',choiceId:'shut-down-forge',name:'Soğutma Bacası',description:'Sönen ocağın altındaki eski bakım yolu.',entry:{x:620,y:440},destination:{x:280,y:260}},
  {id:'dungeon-magma-route',regionId:'deep-dungeon',questId:'dungeon-forge-truth',choiceId:'restart-forge',name:'Magma Yolu',description:'Yeniden yanan ocağın açtığı sıcak geçit.',entry:{x:1780,y:1300},destination:{x:2110,y:1530}},
  {id:'swamp-oracle-sanctum',regionId:'rotten-swamp',questId:'swamp-drowned-vow',choiceId:'free-the-oracle',name:'Kâhinin Sığınağı',description:'Özgür bırakılan kâhinin gizli sunağı.',entry:{x:680,y:500},destination:{x:280,y:280}},
  {id:'swamp-crown-marsh',regionId:'rotten-swamp',questId:'swamp-drowned-vow',choiceId:'take-the-oracles-place',name:'Taç Bataklığı',description:'Yemini devralanın hükmettiği sazlık yolu.',entry:{x:1780,y:1260},destination:{x:2110,y:1510}},
  {id:'castle-dawn-corridor',regionId:'cursed-castle',questId:'castle-veil-heir',choiceId:'mend-the-veil',name:'Şafak Koridoru',description:'Onarılan Perdenin ardındaki güvenli koridor.',entry:{x:650,y:1250},destination:{x:280,y:1530}},
  {id:'castle-beyond-gate',regionId:'cursed-castle',questId:'castle-veil-heir',choiceId:'tear-the-veil',name:'Perde Ötesi Kapısı',description:'Yırtılan Perdenin açtığı karanlık geçit.',entry:{x:1780,y:450},destination:{x:2110,y:270}}
] satisfies readonly RegionPathDefinition[];
