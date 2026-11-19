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
 assert.equal(stepEnemyAI(mimic,{...actor,exposedUntil:9000},{x:300,y:0},5000,16).state.burrowed,false);
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


test('all five bosses have complete three-phase definitions linked to their authored regions',()=>{
 assert.equal(BOSSES.length,5);
 assert.equal(new Set(BOSSES.map(b=>b.id)).size,5);
 const attackIds=new Set();
 for(const boss of BOSSES){
  const region=REGIONS.find(r=>r.id===boss.regionId);
  assert.ok(region,boss.id+' must reference an existing region');
  assert.equal(region.bossId,boss.id,boss.id+' must be the boss authored for its region');
  assert.ok(boss.health>0&&boss.contactDamage>0,boss.id+' must have positive combat stats');
  assert.equal(boss.phases.length,3,boss.id+' must define exactly three phases');
  assert.deepEqual(boss.phases.map(p=>p.healthThreshold),[1,.66,.3],boss.id+' phase thresholds must be ordered and complete');
  for(const phase of boss.phases){
   assert.ok(phase.name&&phase.arenaChange&&phase.phaseRule, boss.id+'/'+phase.id+' must describe its phase');
   assert.ok(phase.attacks.length>=2,boss.id+'/'+phase.id+' must offer multiple attacks');
   for(const attack of phase.attacks){
    assert.ok(!attackIds.has(attack.id),attack.id+' must be globally unique');
    attackIds.add(attack.id);
    assert.ok(attack.damage>0&&attack.range>0&&attack.cooldownMs>0,attack.id+' must have valid combat values');
    assert.ok(attack.telegraph.warningMs>0&&attack.telegraph.cue,attack.id+' must have a readable telegraph');
   }
   for(const enemyId of phase.addEnemyIds)assert.ok(ENEMIES.some(e=>e.id===enemyId),boss.id+'/'+phase.id+' references missing add '+enemyId);
  }
  assert.ok(boss.reward.soulEssence>0&&boss.reward.relicId&&boss.reward.unlockId,boss.id+' must define a reward and unlock');
 }
});

test('every boss crosses both authored phase thresholds and records transition times',()=>{
 for(const boss of BOSSES){
  let state=createBossEncounter(boss);
  assert.equal(state.phaseIndex,0,boss.id+' starts in phase one');
  let hit=damageBoss(state,boss,boss.health*.35,1000);
  assert.equal(hit.changed,true,boss.id+' should enter phase two');
  assert.equal(hit.previous.id,boss.phases[0].id);
  assert.equal(hit.current.id,boss.phases[1].id);
  assert.equal(hit.state.phaseIndex,1);
  assert.equal(hit.state.phaseChangedAt,1000);
  hit=damageBoss(hit.state,boss,boss.health*.36,2000);
  assert.equal(hit.changed,true,boss.id+' should enter phase three');
  assert.equal(hit.previous.id,boss.phases[1].id);
  assert.equal(hit.current.id,boss.phases[2].id);
  assert.equal(hit.state.phaseIndex,2);
  assert.equal(hit.state.phaseChangedAt,2000);
  assert.equal(hit.state.defeated,false,boss.id+' must remain alive above zero health');
 }
});

test('all boss phase attacks have independent cooldowns and become ready again',()=>{
 for(const boss of BOSSES){
  for(const phase of boss.phases){
   let state=createBossEncounter(boss);
   const first=getBossAttack(state,phase,1000);
   assert.ok(first.attack,boss.id+'/'+phase.id+' should issue its first attack');
   assert.equal(first.attack.id,phase.attacks[0].id);
   const second=getBossAttack(first.state,phase,1001);
   assert.ok(second.attack,boss.id+'/'+phase.id+' should issue a different ready attack');
   assert.equal(second.attack.id,phase.attacks[1].id);
   const cooling=getBossAttack(second.state,phase,1002);
   assert.equal(cooling.attack,undefined,boss.id+'/'+phase.id+' must respect both attack cooldowns');
   const readyAgain=getBossAttack(cooling.state,phase,6200);
   assert.equal(readyAgain.attack.id,phase.attacks[0].id,boss.id+'/'+phase.id+' first attack should become ready after its cooldown');
  }
 }
});

test('boss damage clamps at zero and ignores negative damage for every encounter',()=>{
 for(const boss of BOSSES){
  const initial=createBossEncounter(boss);
  const ignored=damageBoss(initial,boss,-500,100);
  assert.equal(ignored.state.health,boss.health);
  assert.equal(ignored.state.defeated,false);
  const defeated=damageBoss(initial,boss,boss.health*2,200);
  assert.equal(defeated.state.health,0);
  assert.equal(defeated.state.defeated,true);
  assert.equal(defeated.state.phaseIndex,2);
 }
});

test('all 25 enemies expose valid authored attacks and deterministic non-mutating AI intents',()=>{
 assert.equal(ENEMIES.length,25);
 assert.equal(new Set(ENEMIES.map(e=>e.id)).size,25);
 for(const enemy of ENEMIES){
  assert.ok(REGIONS.some(r=>r.id===enemy.regionId),enemy.id+' must belong to a known region');
  assert.ok(enemy.health>0&&enemy.speed>0&&enemy.radius>0,enemy.id+' must have positive movement and health stats');
  assert.ok(enemy.contactDamage>=0&&enemy.experience>=0,enemy.id+' must have non-negative damage and XP');
  assert.ok(enemy.attack.id&&enemy.attack.range>0&&enemy.attack.cooldownMs>0,enemy.id+' must define an attack cadence');
  assert.ok(enemy.attack.telegraph.warningMs>0&&enemy.attack.telegraph.cue,enemy.id+' must define a telegraph');
  const actor={x:0,y:0,health:enemy.health,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,nextSpecialAt:0,attackCount:0};
  const before=JSON.parse(JSON.stringify(actor));
  const first=stepEnemyAI(enemy,actor,{x:80,y:0},5000,16);
  const repeated=stepEnemyAI(enemy,actor,{x:80,y:0},5000,16);
  assert.deepEqual(first,repeated,enemy.id+' must be deterministic for identical inputs');
  assert.deepEqual(actor,before,enemy.id+' must not mutate the caller-owned actor state');
  assert.ok(Number.isFinite(first.velocityX)&&Number.isFinite(first.velocityY),enemy.id+' movement must remain finite');
  if(first.state.burrowed)assert.equal(first.attack,undefined,enemy.id+' cannot attack while burrowed');
  else assert.ok(first.attack,enemy.id+' should attack when in range and ready');
  if(first.attack){
   const cooling=stepEnemyAI(enemy,first.state,{x:80,y:0},5001,16);
   assert.equal(cooling.attack,undefined,enemy.id+' must respect its attack cooldown');
  }
  const distant=stepEnemyAI(enemy,actor,{x:10000,y:0},5000,16);
  assert.equal(distant.attack,undefined,enemy.id+' must not attack outside its authored range');
 }
});

test('every enemy special behavior maps to the intended action and only special archetypes emit one',()=>{
 const specialByBehavior={
  'nest-summon':'summon','support-heal':'heal','rune-sapper':'trap',
  'hex-caster':'hex','web-control':'web','frost-hunt':'frost-trail',
  'duelist':'parry','flank':'pounce','poison-volley':'spore-cloud'
 };
 for(const enemy of ENEMIES){
  const actor={x:0,y:0,health:enemy.health,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false,nextSpecialAt:0,attackCount:0};
  const intent=stepEnemyAI(enemy,actor,{x:120,y:0},5000,16);
  const expected=specialByBehavior[enemy.behavior];
  assert.equal(intent.special?.kind,expected,enemy.id+' special action must match its behavior archetype');
  if(expected){
   assert.ok(intent.special.radius>=0&&intent.special.durationMs>=0&&intent.special.count>=0,enemy.id+' special action values must be non-negative');
   assert.ok(intent.state.nextSpecialAt>5000,enemy.id+' must schedule the next special action');
  }
 }
});

test('seven elements define distinct status identities and all authored reactions are symmetric and typed',()=>{
 const ids=new Set(ELEMENTS.map(element=>element.id));
 assert.equal(ids.size,7);
 const reactionIds=new Set();
 const pairs=new Set();
 for(const element of ELEMENTS)for(const reaction of element.reactions){
  assert.ok(['burst','spread','shatter','soul-chain','conductive-chain','siphon','rupture'].includes(reaction.kind));
  assert.ok(!reactionIds.has(reaction.id),'reaction IDs must be unique');
  reactionIds.add(reaction.id);
  const pair=[element.id,reaction.with].sort().join(':');
  assert.ok(!pairs.has(pair),'only one authored reaction per pair');
  pairs.add(pair);
 }
 assert.equal(reactionIds.size,7);
 assert.equal(pairs.size,7);
});

test('every authored elemental reaction resolves with its distinct effect payload and bounded status stacks',()=>{
 const cases=[
  ['fire','ice','thermal-shock','burst'],
  ['fire','poison','ignition-plague','spread'],
  ['ice','lightning','shatter-arc','shatter'],
  ['dark','spirit','soul-rupture','soul-chain'],
  ['lightning','poison','conductive-plague','conductive-chain'],
  ['blood','fire','crimson-ignition','rupture'],
  ['blood','spirit','blood-soul-siphon','siphon']
 ];
 for(const [first,second,id,kind] of cases){
  let state={};
  const a=ELEMENTS.find(element=>element.id===first);
  const b=ELEMENTS.find(element=>element.id===second);
  for(let i=0;i<7;i++)state=applyElementHit(state,a,10,0,1000+i,ELEMENTS).state;
  let result;
  for(let i=0;i<7;i++)result=applyElementHit(state,b,10,0,2000+i,ELEMENTS);
  assert.equal(result.reaction?.id,id);
  assert.equal(result.reaction?.kind,kind);
  assert.ok(result.reaction.damage>0);
  for(const status of Object.values(result.state))assert.ok(status.stacks<=5&&status.stacks>=0);
 }
});

test('ice threshold freezes briefly, poison increases incoming damage, and control expires',()=>{
 let state={};
 const ice=ELEMENTS.find(element=>element.id==='ice');
 for(let i=0;i<7;i++)state=applyElementHit(state,ice,10,0,1000+i,ELEMENTS).state;
 const frozen=tickElementStatuses(state,1100);
 assert.equal(frozen.frozen,true);
 assert.equal(tickElementStatuses(frozen.state,1500).frozen,false);
 state={poison:{buildup:0,stacks:4,expiresAt:5000,nextTickAt:2000}};
 assert.equal(tickElementStatuses(state,1500).damageTakenMultiplier,1.1);
 assert.equal(tickElementStatuses(state,6000).damageTakenMultiplier,1);
});
