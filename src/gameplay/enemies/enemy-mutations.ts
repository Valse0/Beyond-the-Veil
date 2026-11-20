import type {EnemyMutationId} from '../../core/types/content.js';
import {waveRandom} from '../spawning/wave-director.js';

export interface EnemyMutationDefinition {
  id:EnemyMutationId;
  label:string;
  color:number;
  textColor:string;
}

export const ENEMY_MUTATIONS:readonly EnemyMutationDefinition[]=[
  {id:'poisonous',label:'ZEHİRLİ',color:0x8fbd55,textColor:'#c8f29a'},
  {id:'explosive',label:'PATLAYICI',color:0xe7a34b,textColor:'#ffd28b'},
  {id:'armored',label:'ZIRHLI',color:0x9da7b4,textColor:'#e1e7ee'},
  {id:'fast',label:'HIZLI',color:0x62c9d4,textColor:'#a5f4fa'},
  {id:'vampiric',label:'VAMPİRİK',color:0xb94d68,textColor:'#ffb0c0'},
  {id:'cursed',label:'LANETLİ',color:0x9b78c8,textColor:'#d8b9ff'}
];

export const ENEMY_MUTATION_CURSE_DURATION_MS=4_000;
export const ENEMY_MUTATION_CURSE_DAMAGE_MULTIPLIER=1.15;
export const ENEMY_MUTATION_EXPLOSION_RADIUS=92;
export const ENEMY_MUTATION_EXPLOSION_DAMAGE_MULTIPLIER=1.25;
export const ENEMY_MUTATION_POISON_DURATION_MS=6_000;
export const ENEMY_MUTATION_VAMPIRIC_HEAL_RATIO=.2;

/** Mutation chance starts after the opening three minutes and rises to 25% by the first boss. */
export function getEnemyMutationChance(elapsedMs:number):number {
  const elapsed=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0;
  if(elapsed<180_000)return 0;
  const progress=Math.min(1,(elapsed-180_000)/(14*60_000-180_000));
  return .08+progress*.17;
}

/** Stable per-run/per-spawn roll. No mutable RNG state is consumed by combat. */
export function resolveEnemyMutation(
  seed:number,
  spawnIndex:number,
  elapsedMs:number,
  slots:readonly EnemyMutationId[]
):EnemyMutationId|null {
  const chance=getEnemyMutationChance(elapsedMs);
  if(!slots.length||chance<=0||waveRandom(seed,spawnIndex,71)>=chance)return null;
  const allowed=slots.filter(id=>ENEMY_MUTATIONS.some(mutation=>mutation.id===id));
  if(!allowed.length)return null;
  const selected=Math.floor(waveRandom(seed,spawnIndex,72)*allowed.length);
  return allowed[selected]??null;
}

export function getEnemyMutation(id:unknown):EnemyMutationDefinition|undefined {
  return ENEMY_MUTATIONS.find(mutation=>mutation.id===id);
}

export function getEnemyMutationDamageMultiplier(id:unknown):number {
  return id==='armored'?.7:1;
}

export function getEnemyMutationMoveSpeedMultiplier(id:unknown):number {
  return id==='fast'?1.3:1;
}
