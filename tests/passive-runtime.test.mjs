import test from 'node:test';
import assert from 'node:assert/strict';
import {PASSIVES} from '../.test-dist/src/data/passives.js';
import {EMPTY_BUILD,addPassive,choosePassiveSpecial} from '../.test-dist/src/gameplay/weapons/build-runtime.js';
import {
 createPassiveSpecialRuntimeState,getActivePassiveMechanics,isPassiveSpecialActive,tryPassiveCooldown,
 resolveSealedPlate,resolveLastWard,getLowHealthLifestealBonus,addCurseStack,isFrozenTarget,
 isPoisonBloomReady,resolveCriticalHit,getWeakenedDamageMultiplier,grantFreeReroll
} from '../.test-dist/src/gameplay/passives/passive-runtime.js';

test('all twelve passives define one distinct typed special mechanic',()=>{
 assert.equal(PASSIVES.length,12);
 const kinds=PASSIVES.map(item=>item.specialUpgrade.mechanic.kind);
 assert.equal(new Set(kinds).size,12);
 for(const passive of PASSIVES){
  assert.ok(passive.specialUpgrade.id);
  assert.ok(passive.specialUpgrade.name);
  assert.ok(passive.specialUpgrade.effect);
  assert.ok(passive.specialUpgrade.mechanic.kind);
 }
});
test('a passive special can only be selected after level five and only once',()=>{
 const passive=PASSIVES.find(item=>item.id==='ashen-heart');
 let build=addPassive(EMPTY_BUILD,passive);
 assert.equal(choosePassiveSpecial(build,passive),build);
 for(let i=0;i<4;i++)build={...build,passives:build.passives.map(p=>({...p,level:p.level+1}))};
 build=choosePassiveSpecial(build,passive);
 assert.equal(isPassiveSpecialActive(build,passive.id),true);
 assert.equal(choosePassiveSpecial(build,passive),build);
 assert.equal(getActivePassiveMechanics(build,PASSIVES)[0].kind,'fire-explosion');
});
test('fire explosion cooldown prevents repeated secondary blasts inside its window',()=>{
 let state=createPassiveSpecialRuntimeState();
 let result=tryPassiveCooldown(state,'ember-core',1000,850);state=result.state;
 assert.equal(result.triggered,true);
 result=tryPassiveCooldown(state,'ember-core',1500,850);
 assert.equal(result.triggered,false);
 result=tryPassiveCooldown(state,'ember-core',1900,850);
 assert.equal(result.triggered,true);
});
test('ice shatter only applies to a currently frozen target',()=>{
 assert.equal(isFrozenTarget(3000,2500),true);
 assert.equal(isFrozenTarget(2500,2500),false);
 assert.equal(isFrozenTarget(undefined,100),false);
 const mechanic=PASSIVES.find(item=>item.id==='frostbound-sigil').specialUpgrade.mechanic;
 assert.equal(mechanic.minimumHitDamage,38);
});
test('poison bloom requires the maximum five stacks',()=>{
 assert.equal(isPoisonBloomReady(4,5),false);
 assert.equal(isPoisonBloomReady(5,5),true);
 assert.equal(isPoisonBloomReady(6,5),true);
 assert.equal(PASSIVES.find(item=>item.id==='venom-vial').specialUpgrade.mechanic.kind,'poison-spores');
});
test('critical hits gain a multiplier and Night Thread adds capped curse stacks',()=>{
 assert.deepEqual(resolveCriticalHit(100,.2,.1,1.5),{damage:150,critical:true});
 assert.deepEqual(resolveCriticalHit(100,.2,.8,1.5),{damage:100,critical:false});
 assert.equal(addCurseStack(2,1),3);
 assert.equal(addCurseStack(3,1),3);
 assert.equal(PASSIVES.find(item=>item.id==='veil-thread').specialUpgrade.mechanic.kind,'critical-curse');
});
test('Open Vessel defines collectible boss essence fragments',()=>{
 const mechanic=PASSIVES.find(item=>item.id==='soul-vessel').specialUpgrade.mechanic;
 assert.equal(mechanic.kind,'boss-essence');
 assert.equal(mechanic.fragmentCount*mechanic.essencePerFragment,30);
});
test('Living Storm defines a bounded lightning field',()=>{
 const mechanic=PASSIVES.find(item=>item.id==='storm-conductor').specialUpgrade.mechanic;
 assert.equal(mechanic.kind,'lightning-field');
 assert.ok(mechanic.durationMs>0&&mechanic.tickMs>0&&mechanic.radius>0);
});
test('Red Sacrament lifesteal bonus only activates below its health threshold',()=>{
 const mechanic=PASSIVES.find(item=>item.id==='blood-reliquary').specialUpgrade.mechanic;
 assert.equal(getLowHealthLifestealBonus(39,100,mechanic),.15);
 assert.equal(getLowHealthLifestealBonus(40,100,mechanic),.15);
 assert.equal(getLowHealthLifestealBonus(41,100,mechanic),0);
});
test('Sealed Plate blocks one hit per thirty-second interval',()=>{
 let state=createPassiveSpecialRuntimeState();
 let result=resolveSealedPlate(state,29999,true,30000);assert.equal(result.blocked,false);
 result=resolveSealedPlate(state,30000,true,30000);assert.equal(result.blocked,true);state=result.state;
 result=resolveSealedPlate(state,45000,true,30000);assert.equal(result.blocked,false);
 result=resolveSealedPlate(state,60000,true,30000);assert.equal(result.blocked,true);
});
test('Ghost Step grants an additional post-dash immunity window',()=>{
 const mechanic=PASSIVES.find(item=>item.id==='hunters-greaves').specialUpgrade.mechanic;
 assert.equal(mechanic.kind,'ghost-step');assert.equal(190+mechanic.immunityMs,550);
});
test('Clear Script grants exactly one free reroll per run',()=>{
 let state=createPassiveSpecialRuntimeState();
 let result=grantFreeReroll(state,true);assert.equal(result.free,true);state=result.state;
 result=grantFreeReroll(state,true);assert.equal(result.free,false);
 assert.equal(PASSIVES.find(item=>item.id==='scribes-lens').specialUpgrade.mechanic.kind,'free-reroll');
});
test('Last Ward prevents one lethal hit and cannot trigger a second time',()=>{
 let result=resolveLastWard(20,25,false,true,1);
 assert.deepEqual(result,{health:1,used:true,triggered:true});
 result=resolveLastWard(1,25,result.used,true,1);
 assert.deepEqual(result,{health:0,used:true,triggered:false});
});
test('Crown of Ashes weakens enemy damage only during its five-second window',()=>{
 const mechanic=PASSIVES.find(item=>item.id==='hollow-crown').specialUpgrade.mechanic;
 assert.equal(mechanic.kind,'crown-weaken');
 assert.equal(getWeakenedDamageMultiplier(6000,5000,.7),.7);
 assert.equal(getWeakenedDamageMultiplier(5000,5000,.7),1);
});
