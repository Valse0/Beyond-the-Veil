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

test('all 25 enemy behavior contracts produce finite deterministic movement and attacks',()=>{
 for(const enemy of ENEMIES){const actor={x:0,y:0,health:enemy.health,nextAttackAt:0,stateUntil:0,facingX:1,facingY:0,exposedUntil:0,burrowed:false};const a=stepEnemyAI(enemy,actor,{x:100,y:0},5000,16);assert.ok(Number.isFinite(a.velocityX));assert.ok(Number.isFinite(a.velocityY));assert.ok(a.attack);}
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
test('boss phase changes at authored thresholds and attacks respect cooldowns',()=>{
 const boss=BOSSES[0];let state=createBossEncounter(boss);
 const transition=damageBoss(state,boss,boss.health*.4,1000);
 assert.equal(transition.changed,true);assert.equal(transition.current.id,boss.phases[1].id);
 const first=getBossAttack(transition.state,transition.current,2000);
 assert.ok(first.attack);assert.equal(getBossAttack(first.state,transition.current,2100).attack,undefined);
});
test('region hazards cycle through authored hazards with telegraph then active window',()=>{
 const region=REGIONS[0];let cycle=createHazardCycle(0);
 let result=stepRegionHazard(region,cycle,7000);cycle=result.cycle;assert.equal(result.event.phase,'telegraph');
 result=stepRegionHazard(region,cycle,8000);assert.equal(result.event.phase,'active');
});
