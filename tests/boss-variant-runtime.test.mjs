import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../.test-dist/src/data/bosses.js';
import { ENEMIES } from '../.test-dist/src/data/enemies.js';
import { BOSS_VARIANTS } from '../.test-dist/src/data/boss-variants.js';
import { resolveBossVariant } from '../.test-dist/src/gameplay/bosses/boss-variant-runtime.js';

test('catalog contains ten unique story-linked boss variants across all five bosses',()=>{
  assert.equal(BOSS_VARIANTS.length,10);
  assert.equal(new Set(BOSS_VARIANTS.map(item=>item.id)).size,10);
  assert.deepEqual(new Set(BOSS_VARIANTS.map(item=>item.bossId)),new Set(BOSSES.map(item=>item.id)));
  for(const variant of BOSS_VARIANTS){
    assert.equal(variant.phases.length,3,variant.id);
    assert.ok(variant.name.length>0&&variant.description.length>20,variant.id);
    for(const phase of variant.phases){
      assert.equal(phase.attacks.length,2,variant.id+' '+phase.id);
      assert.ok(phase.addEnemyIds.length>0,variant.id+' '+phase.id);
      for(const enemyId of phase.addEnemyIds)assert.ok(ENEMIES.some(enemy=>enemy.id===enemyId),variant.id+' references unknown support enemy '+enemyId);
      assert.ok(phase.bossDamageMultiplier>=.8&&phase.bossDamageMultiplier<=1.3,variant.id+' '+phase.id);
      assert.ok(phase.movementMultiplier>=.75&&phase.movementMultiplier<=1.3,variant.id+' '+phase.id);
      assert.ok(phase.attacks.every(attack=>attack.telegraph.warningMs>=550&&attack.cooldownMs>=3300),variant.id+' '+phase.id);
    }
  }
});

test('no selected story outcome preserves the exact original boss definition',()=>{
  for(const boss of BOSSES){
    const resolved=resolveBossVariant(boss,[]);
    assert.equal(resolved.boss,boss);
    assert.equal(resolved.variantId,null);
    assert.equal(resolved.variantName,null);
  }
});

test('each of the ten saved encounter IDs resolves only its matching boss and changes live phase data',()=>{
  for(const variant of BOSS_VARIANTS){
    const base=BOSSES.find(item=>item.id===variant.bossId);
    assert.ok(base);
    const resolved=resolveBossVariant(base,[variant.id]);
    assert.equal(resolved.variantId,variant.id);
    assert.equal(resolved.variantName,variant.name);
    assert.notEqual(resolved.boss,base);
    assert.equal(resolved.boss.id,base.id);
    assert.equal(resolved.boss.health,base.health);
    assert.deepEqual(resolved.boss.reward,base.reward);
    assert.deepEqual(resolved.boss.arena,base.arena);
    assert.deepEqual(resolved.boss.phases.map(p=>p.healthThreshold),base.phases.map(p=>p.healthThreshold));
    assert.deepEqual(resolved.boss.phases.map(p=>p.name),variant.phases.map(p=>p.name));
    assert.deepEqual(resolved.boss.phases.map(p=>p.addEnemyIds),variant.phases.map(p=>p.addEnemyIds));
  }
});

test('encounter selection ignores IDs belonging to another boss and latest matching story choice wins',()=>{
  const forest=BOSSES.find(item=>item.id==='thorn-matriarch');
  const resolved=resolveBossVariant(forest,['ossuary-king-warhost','thorn-matriarch-awakened','thorn-matriarch-corrupted']);
  assert.equal(resolved.variantId,'thorn-matriarch-corrupted');
  assert.equal(resolveBossVariant(forest,['ossuary-king-warhost']).variantId,null);
});
