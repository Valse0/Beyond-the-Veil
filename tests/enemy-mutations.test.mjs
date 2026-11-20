import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES} from '../.test-dist/src/data/enemies.js';
import {
  ENEMY_MUTATIONS,
  ENEMY_MUTATION_CURSE_DAMAGE_MULTIPLIER,
  ENEMY_MUTATION_CURSE_DURATION_MS,
  ENEMY_MUTATION_EXPLOSION_DAMAGE_MULTIPLIER,
  ENEMY_MUTATION_EXPLOSION_RADIUS,
  ENEMY_MUTATION_POISON_DURATION_MS,
  ENEMY_MUTATION_VAMPIRIC_HEAL_RATIO,
  getEnemyMutation,
  getEnemyMutationChance,
  getEnemyMutationDamageMultiplier,
  getEnemyMutationMoveSpeedMultiplier,
  resolveEnemyMutation
} from '../.test-dist/src/gameplay/enemies/enemy-mutations.js';

test('six mutation definitions have unique stable IDs and readable labels',()=>{
  assert.equal(ENEMY_MUTATIONS.length,6);
  assert.equal(new Set(ENEMY_MUTATIONS.map(item=>item.id)).size,6);
  for(const mutation of ENEMY_MUTATIONS){
    assert.ok(mutation.label.length>0);
    assert.ok(Number.isInteger(mutation.color));
    assert.equal(getEnemyMutation(mutation.id),mutation);
  }
});

test('mutation chance is absent during the opening and rises to a bounded late-run chance',()=>{
  assert.equal(getEnemyMutationChance(0),0);
  assert.equal(getEnemyMutationChance(179_999),0);
  assert.equal(getEnemyMutationChance(180_000),.08);
  assert.ok(getEnemyMutationChance(7*60_000)>.08);
  assert.ok(getEnemyMutationChance(11*60_000)>getEnemyMutationChance(7*60_000));
  assert.equal(getEnemyMutationChance(14*60_000),.25);
  assert.equal(getEnemyMutationChance(60*60_000),.25);
});

test('mutation rolls are deterministic for the same seed and spawn index',()=>{
  const slots=ENEMY_MUTATIONS.map(item=>item.id);
  for(let index=0;index<500;index++){
    assert.equal(
      resolveEnemyMutation(0x51a7,index,14*60_000,slots),
      resolveEnemyMutation(0x51a7,index,14*60_000,slots)
    );
  }
});

test('all six mutations can be selected and selection respects each enemy authored slots',()=>{
  const all=ENEMY_MUTATIONS.map(item=>item.id);
  for(const id of all){
    let found=false;
    for(let index=0;index<20_000&&!found;index++){
      found=resolveEnemyMutation(0x51a7,index,14*60_000,all)===id;
    }
    assert.ok(found,'expected deterministic rolls to include '+id);
  }
  for(const enemy of ENEMIES){
    assert.ok(enemy.mutationSlots.length>=3,enemy.id+' needs authored mutation options');
    assert.ok(enemy.mutationSlots.every(id=>all.includes(id)),enemy.id+' contains an unknown mutation');
  }
  assert.ok(ENEMIES.every(enemy=>enemy.mutationSlots.includes('poisonous')||enemy.mutationSlots.includes('explosive')||enemy.mutationSlots.includes('armored')||enemy.mutationSlots.includes('fast')||enemy.mutationSlots.includes('vampiric')||enemy.mutationSlots.includes('cursed')));
  assert.equal(resolveEnemyMutation(123,4,14*60_000,[]),null);
  for(let index=0;index<100;index++){
    const result=resolveEnemyMutation(123,index,14*60_000,['armored']);
    assert.ok(result===null||result==='armored');
  }
});

test('mutation gameplay tuning remains bounded and distinct',()=>{
  assert.equal(getEnemyMutationDamageMultiplier('armored'),.7);
  assert.equal(getEnemyMutationDamageMultiplier('poisonous'),1);
  assert.equal(getEnemyMutationMoveSpeedMultiplier('fast'),1.3);
  assert.equal(getEnemyMutationMoveSpeedMultiplier('armored'),1);
  assert.equal(ENEMY_MUTATION_VAMPIRIC_HEAL_RATIO,.2);
  assert.equal(ENEMY_MUTATION_CURSE_DAMAGE_MULTIPLIER,1.15);
  assert.equal(ENEMY_MUTATION_CURSE_DURATION_MS,4_000);
  assert.equal(ENEMY_MUTATION_POISON_DURATION_MS,6_000);
  assert.equal(ENEMY_MUTATION_EXPLOSION_RADIUS,92);
  assert.equal(ENEMY_MUTATION_EXPLOSION_DAMAGE_MULTIPLIER,1.25);
});
