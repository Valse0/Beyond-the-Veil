import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../.test-dist/src/data/enemies.js';
import { BOSSES } from '../.test-dist/src/data/bosses.js';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { PASSIVES } from '../.test-dist/src/data/passives.js';
import { ELEMENTS } from '../.test-dist/src/data/elements.js';
import { REGIONS } from '../.test-dist/src/data/regions.js';
import { stepEnemyAI } from '../.test-dist/src/gameplay/enemies/enemy-runtime.js';
import { applyElementHit, tickElementStatuses } from '../.test-dist/src/gameplay/elements/element-runtime.js';
import { addWeapon, addPassive, upgradeWeapon, upgradePassive, evolveWeapon, deriveBuildStats, EMPTY_BUILD } from '../.test-dist/src/gameplay/weapons/build-runtime.js';
import { createBossEncounter, damageBoss, getBossAttack } from '../.test-dist/src/gameplay/bosses/boss-runtime.js';
import { createHazardCycle, stepRegionHazard } from '../.test-dist/src/gameplay/regions/region-runtime.js';

test('all 25 enemy behavior contracts return finite movement and respect attack states',()=>{
 for(const enemy of ENEMIES){
  const actor={x:0,y:0,health:enemy.health,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false};
  const a=stepEnemyAI(enemy,actor,{x:100,y:0},5000,16);
  assert.ok(Number.isFinite(a.velocityX));assert.ok(Number.isFinite(a.velocityY));
  if(!a.state.burrowed)assert.ok(a.attack,enemy.id+' should attack in range');
 }
});
test('element buildup crosses threshold, reacts and ticks damage',()=>{
 let state={};let hit;
 for(let i=0;i<7;i++){hit=applyElementHit(state,ELEMENTS.find(e=>e.id==='fire'),20,0,1000+i*10,ELEMENTS);state=hit.state;}
 assert.equal(hit.triggered,true);
 state={...state,poison:{buildup:0,stacks:2,expiresAt:9000,nextTickAt:1000}};
 hit=applyElementHit(state,ELEMENTS.find(e=>e.id==='fire'),20,0,2000,ELEMENTS);
 assert.ok(hit.reaction);assert.ok(hit.reaction.damage>20);
 assert.ok(tickElementStatuses(hit.state,4000).damage>0);
});
test('weapon and passive levels, slots and evolution are enforced',()=>{
 let build=EMPTY_BUILD;const w=WEAPONS[0],p=PASSIVES.find(x=>x.id===w.evolution.requiredPassiveId);
 build=addWeapon(build,w);build=addPassive(build,p);
 for(let i=0;i<5;i++){build=upgradeWeapon(build,w);build=upgradePassive(build,p);}
 build=evolveWeapon(build,w);assert.equal(build.weapons[0].evolved,true);
 assert.ok(deriveBuildStats(build,PASSIVES).magnetRadiusBonus>=0);
});
test('boss phase changes at authored thresholds and individual attacks respect cooldowns',()=>{
 const boss=BOSSES[0];const state=createBossEncounter(boss);
 const transition=damageBoss(state,boss,boss.health*.4,1000);
 assert.equal(transition.changed,true);assert.equal(transition.current.id,boss.phases[1].id);
 const first=getBossAttack(transition.state,transition.current,2000);
 assert.ok(first.attack);
 const second=getBossAttack(first.state,transition.current,2100);
 assert.ok(second.attack);assert.notEqual(second.attack.id,first.attack.id);
});
test('region hazards cycle through authored hazards with telegraph then active window',()=>{
 const region=REGIONS[0];let cycle=createHazardCycle(0);
 let result=stepRegionHazard(region,cycle,7000);cycle=result.cycle;assert.equal(result.event.phase,'telegraph');
 result=stepRegionHazard(region,cycle,8000);assert.equal(result.event.phase,'active');
});

test('lightning status produces short stun pulses instead of a permanent lock',()=>{
 let state={};
 const lightning=ELEMENTS.find(e=>e.id==='lightning');
 for(let i=0;i<7;i++)state=applyElementHit(state,lightning,10,0,1000+i*10,ELEMENTS).state;
 const first=tickElementStatuses(state,2100);
 assert.equal(first.stunned,true);
 const afterPulse=tickElementStatuses(first.state,2400);
 assert.equal(afterPulse.stunned,false);
});

test('blood buildup respects its four-stack cap',()=>{
 let state={};const blood=ELEMENTS.find(e=>e.id==='blood');
 for(let i=0;i<30;i++)state=applyElementHit(state,blood,10,0,1000+i*10,ELEMENTS).state;
 assert.equal(state.blood.stacks,4);
});

test('authored support, control and zone enemies emit their distinct special actions',()=>{
 const expected={
  'gravebloom-nest':'summon','mourner-acolyte':'heal','rune-sapper':'trap',
  'mire-witch':'hex','web-weaver':'web','frost-hound':'frost-trail',
  'chain-duelist':'parry','spore-spitter':'spore-cloud','thorn-pouncer':'pounce'
 };
 for(const [id,kind] of Object.entries(expected)){
  const enemy=ENEMIES.find(e=>e.id===id);
  const actor={x:0,y:0,health:enemy.health,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,nextSpecialAt:0,attackCount:0};
  const intent=stepEnemyAI(enemy,actor,{x:120,y:0},5000,16);
  assert.equal(intent.special?.kind,kind,id+' should emit '+kind);
  assert.ok(intent.state.nextSpecialAt>5000,id+' should schedule its next special');
 }
});
test('mimics conceal themselves at range while phase stalkers use timed vanish windows',()=>{
 const mimic=ENEMIES.find(e=>e.id==='mirror-mimic');
 const stalker=ENEMIES.find(e=>e.id==='veil-stalker');
 const actor={x:0,y:0,health:100,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false};
 assert.equal(stepEnemyAI(mimic,actor,{x:300,y:0},5000,16).state.burrowed,true);
 assert.equal(stepEnemyAI(mimic,actor,{x:100,y:0},5000,16).state.burrowed,false);
 assert.equal(stepEnemyAI(stalker,actor,{x:100,y:0},3200,16).state.burrowed,true);
});
test('enemy attack counters advance only when a telegraphed attack is issued',()=>{
 const enemy=ENEMIES.find(e=>e.id==='rootbound-husk');
 const actor={x:0,y:0,health:100,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,attackCount:2};
 const intent=stepEnemyAI(enemy,actor,{x:100,y:0},5000,16);
 assert.equal(intent.state.attackCount,3);
 const cooling=stepEnemyAI(enemy,{...intent.state,nextAttackAt:9000},{x:100,y:0},5100,16);
 assert.equal(cooling.state.attackCount,3);
});
