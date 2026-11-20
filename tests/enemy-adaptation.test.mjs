import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES} from '../.test-dist/src/data/enemies.js';
import {PASSIVES} from '../.test-dist/src/data/passives.js';
import {WEAPONS} from '../.test-dist/src/data/weapons.js';
import {
  EMPTY_ENEMY_ADAPTATION_PROFILE,EMPTY_ENEMY_ADAPTATION_STATE,
  ENEMY_ADAPTATION_COOLDOWN_MS,ENEMY_ADAPTATION_DAMAGE_MULTIPLIER,
  ENEMY_ADAPTATION_HIT_WINDOW_MS,ENEMY_ADAPTATION_REQUIRED_HITS,
  ENEMY_ADAPTATION_SHIELD_DURATION_MS,deriveEnemyAdaptationProfile,
  getEnemyAdaptationDamageMultiplier,isEnemyAdaptationEligible,
  recordEnemyAdaptationElementHit,resolveEnemyAdaptationVelocity
} from '../.test-dist/src/gameplay/enemies/enemy-adaptation.js';
const build=(weapons,passives=[])=>({weapons,passives});
const weapon=(weaponId,branchId)=>({weaponId,level:3,evolved:false,...(branchId?{branchId}:{})});
const passive=(passiveId)=>({passiveId,level:5,special:true});

test('two matching weapon elements create one dominant element; tied elements do not guess',()=>{
 const fire=deriveEnemyAdaptationProfile(build([weapon('ember-chains'),weapon('rune-mortar')]),WEAPONS,PASSIVES);
 assert.equal(fire.dominantElement,'fire');
 const tie=deriveEnemyAdaptationProfile(build([weapon('ember-chains'),weapon('rune-mortar'),weapon('veil-bolt'),weapon('soul-lantern')]),WEAPONS,PASSIVES);
 assert.equal(tie.dominantElement,null);
 assert.equal(deriveEnemyAdaptationProfile(build([weapon('ember-chains')]),WEAPONS,PASSIVES).dominantElement,null);
});
test('area and precision profiles need a score lead and recognize branches and passive specials',()=>{
 const area=deriveEnemyAdaptationProfile(build([weapon('briar-seed'),weapon('rune-mortar')]),WEAPONS,PASSIVES);
 assert.equal(area.tactic,'spread');assert.ok(area.areaScore>=2);
 const precision=deriveEnemyAdaptationProfile(build([weapon('veil-bolt'),weapon('oath-pike')]),WEAPONS,PASSIVES);
 assert.equal(precision.tactic,'strafe');assert.ok(precision.precisionScore>=2);
 const spread=deriveEnemyAdaptationProfile(build([weapon('gravecleaver','gravecleaver-branch-spread'),weapon('iron-bell')]),WEAPONS,PASSIVES);
 assert.equal(spread.tactic,'spread');
 const passiveArea=deriveEnemyAdaptationProfile(build([weapon('briar-seed')],[passive('venom-vial')]),WEAPONS,PASSIVES);
 assert.equal(passiveArea.tactic,'spread');
 const tied=deriveEnemyAdaptationProfile(build([weapon('briar-seed','briar-seed-branch-spread'),weapon('oath-pike','oath-pike-branch-focus')]),WEAPONS,PASSIVES);
 assert.equal(tied.tactic,null);
});
test('three dominant-element hits in four seconds activate a timed 15 percent shield',()=>{
 let state={...EMPTY_ENEMY_ADAPTATION_STATE};
 for(const time of [100,500]){const hit=recordEnemyAdaptationElementHit(state,'fire','fire',time);assert.equal(hit.activated,false);state=hit.state;}
 const third=recordEnemyAdaptationElementHit(state,'fire','fire',3_000);
 assert.equal(third.activated,true);
 assert.equal(third.state.shieldUntil,3_000+ENEMY_ADAPTATION_SHIELD_DURATION_MS);
 assert.equal(third.state.cooldownUntil,3_000+ENEMY_ADAPTATION_COOLDOWN_MS);
 assert.equal(third.state.hitCount,0);
 assert.equal(getEnemyAdaptationDamageMultiplier(third.state,'fire',3_100),ENEMY_ADAPTATION_DAMAGE_MULTIPLIER);
 assert.equal(getEnemyAdaptationDamageMultiplier(third.state,'ice',3_100),1);
 assert.equal(getEnemyAdaptationDamageMultiplier(third.state,'fire',5_500),1);
 assert.equal(ENEMY_ADAPTATION_HIT_WINDOW_MS,4_000);assert.equal(ENEMY_ADAPTATION_REQUIRED_HITS,3);
 assert.equal(ENEMY_ADAPTATION_COOLDOWN_MS,10_000);
});
test('element hit window resets after four seconds and cooldown prevents immediate retrigger',()=>{
 let state={...EMPTY_ENEMY_ADAPTATION_STATE};
 state=recordEnemyAdaptationElementHit(state,'fire','fire',100).state;
 state=recordEnemyAdaptationElementHit(state,'fire','fire',200).state;
 const expired=recordEnemyAdaptationElementHit(state,'fire','fire',4_201);
 assert.equal(expired.activated,false);assert.equal(expired.state.hitCount,1);
 let active={...EMPTY_ENEMY_ADAPTATION_STATE};
 for(const time of [10,20,30])active=recordEnemyAdaptationElementHit(active,'fire','fire',time).state;
 const during=recordEnemyAdaptationElementHit(active,'fire','fire',5_000);
 assert.equal(during.activated,false);assert.equal(during.state.hitCount,0);
});
test('area tactic separates nearby allies without increasing enemy movement speed',()=>{
 const def=ENEMIES.find(item=>item.behavior==='pursue');assert.ok(def);
 const base={x:-100,y:0};
 const result=resolveEnemyAdaptationVelocity(def,base,{x:0,y:0},{x:-200,y:0},[{x:0,y:40}],'spread',1);
 assert.equal(result.mode,'spread');assert.ok(Math.abs(result.velocityY)>1);
 assert.ok(Math.abs(Math.hypot(result.velocityX,result.velocityY)-100)<.001);
 const noAlly=resolveEnemyAdaptationVelocity(def,base,{x:0,y:0},{x:-200,y:0},[],'spread',1);
 assert.equal(noAlly.mode,null);assert.deepEqual({x:noAlly.velocityX,y:noAlly.velocityY},base);
});
test('precision tactic strafes at engagement range while preserving speed',()=>{
 const def=ENEMIES.find(item=>item.behavior==='pursue');assert.ok(def);
 const result=resolveEnemyAdaptationVelocity(def,{x:100,y:0},{x:0,y:0},{x:200,y:0},[],'strafe',1);
 assert.equal(result.mode,'strafe');assert.ok(Math.abs(result.velocityY)>1);
 assert.ok(Math.abs(Math.hypot(result.velocityX,result.velocityY)-100)<.001);
 const far=resolveEnemyAdaptationVelocity(def,{x:100,y:0},{x:0,y:0},{x:500,y:0},[],'strafe',1);
 assert.equal(far.mode,null);
});
test('bosses, elites, summons and non-wave spawns cannot adapt',()=>{
 assert.equal(isEnemyAdaptationEligible({hasRegularSpawnIndex:true}),true);
 assert.equal(isEnemyAdaptationEligible({hasRegularSpawnIndex:true,isBoss:true}),false);
 assert.equal(isEnemyAdaptationEligible({hasRegularSpawnIndex:true,isElite:true}),false);
 assert.equal(isEnemyAdaptationEligible({hasRegularSpawnIndex:true,isSummoned:true}),false);
 assert.equal(isEnemyAdaptationEligible({hasRegularSpawnIndex:false}),false);
 assert.deepEqual(EMPTY_ENEMY_ADAPTATION_PROFILE,{dominantElement:null,tactic:null,areaScore:0,precisionScore:0});
});
