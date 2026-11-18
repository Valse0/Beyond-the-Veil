import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWaveDirector,
  getWaveBand,
  stepWaveDirector,
  waveRandom
} from '../.test-dist/src/gameplay/spawning/wave-director.js';

test('run pacing follows the five authored time bands',()=>{
  assert.equal(getWaveBand(0),'opening');
  assert.equal(getWaveBand(179999),'opening');
  assert.equal(getWaveBand(180000),'rising');
  assert.equal(getWaveBand(419999),'rising');
  assert.equal(getWaveBand(420000),'elite');
  assert.equal(getWaveBand(659999),'elite');
  assert.equal(getWaveBand(660000),'onslaught');
  assert.equal(getWaveBand(839999),'onslaught');
  assert.equal(getWaveBand(840000),'boss');
});

test('identical seeds produce identical spawn cadence and enemy selections',()=>{
  const run=(seed)=>{
    let state=createWaveDirector(seed);
    const plans=[];
    for(const elapsed of [0,1500,3000,180000,181100,420000,420820,660000,660620]){
      const plan=stepWaveDirector(state,elapsed,8,0,42,5);
      state=plan.state;
      plans.push({band:plan.band,count:plan.spawnCount,indices:plan.enemyIndices,elite:plan.eliteDue,next:state.nextSpawnAtMs});
    }
    return plans;
  };
  assert.deepEqual(run(0x12345678),run(0x12345678));
  assert.notDeepEqual(run(0x12345678),run(0x87654321));
  assert.equal(waveRandom(7,12,1),waveRandom(7,12,1));
  assert.notEqual(waveRandom(7,12,1),waveRandom(7,12,2));
});

test('spawn pressure rises while respecting the active-enemy cap',()=>{
  let state=createWaveDirector(99);
  const opening=stepWaveDirector(state,0,0,0,42,5);
  assert.equal(opening.band,'opening');
  assert.equal(opening.spawnCount,1);
  state=opening.state;
  const rising=stepWaveDirector(state,180000,40,0,42,5);
  assert.ok(rising.spawnCount<=2);
  assert.ok(rising.spawnCount<=42-40);
  state=rising.state;
  const full=stepWaveDirector(state,300000,42,0,42,5);
  assert.equal(full.spawnCount,0);
  assert.deepEqual(full.state,state,'a full arena must not consume the next spawn slot');
});

test('elite schedule waits for the previous elite and then resumes every two minutes',()=>{
  let state=createWaveDirector(5);
  const first=stepWaveDirector(state,420000,10,0,42,5);
  assert.equal(first.band,'elite');
  assert.equal(first.eliteDue,true);
  assert.equal(first.state.eliteIndex,1);
  assert.equal(first.state.nextEliteAtMs,540000);

  const held=stepWaveDirector(first.state,540000,12,1,42,5);
  assert.equal(held.eliteDue,false);
  assert.equal(held.state.nextEliteAtMs,540000);

  const next=stepWaveDirector(held.state,540820,12,0,42,5);
  assert.equal(next.eliteDue,true);
  assert.equal(next.state.eliteIndex,2);
  assert.equal(next.state.nextEliteAtMs,660820);
});

test('elite spawns are deferred when the arena is full instead of being lost',()=>{
  const state=createWaveDirector(17);
  const full=stepWaveDirector(state,420000,42,0,42,5);
  assert.equal(full.spawnCount,0);
  assert.equal(full.eliteDue,false);
  assert.equal(full.state.eliteIndex,0);
  const available=stepWaveDirector(full.state,420000,41,0,42,5);
  assert.equal(available.eliteDue,true);
  assert.ok(available.spawnCount<=1);
});

test('boss phase stops regular spawns and leaves director state unchanged',()=>{
  const state=createWaveDirector(21);
  const boss=stepWaveDirector(state,840000,10,0,42,5);
  assert.equal(boss.band,'boss');
  assert.equal(boss.spawnCount,0);
  assert.deepEqual(boss.state,state);
});

test('invalid seeds and empty enemy pools fail safely',()=>{
  assert.equal(createWaveDirector(Number.NaN).seed,1);
  assert.equal(createWaveDirector(0).seed,1);
  const state=createWaveDirector(3);
  const empty=stepWaveDirector(state,0,0,0,42,0);
  assert.equal(empty.spawnCount,0);
  assert.deepEqual(empty.state,state);
});
