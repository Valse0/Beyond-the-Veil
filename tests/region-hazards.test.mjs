import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../.test-dist/src/data/regions.js';
import { createHazardCycle, getRegionHazardMechanic, stepRegionHazard } from '../.test-dist/src/gameplay/regions/region-runtime.js';

test('all five regions define four hazards with unique IDs and readable counters',()=>{
  const hazards=REGIONS.flatMap(region=>region.hazards.map(hazard=>({...hazard,regionId:region.id})));
  assert.equal(REGIONS.length,5);
  assert.equal(hazards.length,20);
  assert.equal(new Set(hazards.map(hazard=>hazard.id)).size,20);
  for(const hazard of hazards){
    assert.ok(hazard.name.trim().length>0,hazard.id+' needs a name');
    assert.ok(hazard.trigger.trim().length>0,hazard.id+' needs a trigger');
    assert.ok(hazard.effect.trim().length>0,hazard.id+' needs an effect');
    assert.ok(hazard.counter.trim().length>0,hazard.id+' needs a counter');
    assert.ok(hazard.telegraphMs>=0,hazard.id+' needs a non-negative telegraph');
  }
  for(const region of REGIONS)assert.equal(region.hazards.length,4,region.id+' must retain four authored hazards');
});

test('every authored region hazard resolves to a distinct gameplay profile',()=>{
  const hazards=REGIONS.flatMap(region=>region.hazards);
  const profiles=hazards.map(hazard=>getRegionHazardMechanic(hazard.id));
  assert.ok(profiles.every(Boolean),'all 20 hazards must have runtime mechanics');
  for(const [index,hazard] of hazards.entries()){
    const mechanic=profiles[index];
    assert.ok(['circle','ring','line','cross'].includes(mechanic.shape),hazard.id+' has a supported attack shape');
    assert.ok(mechanic.radius>0,hazard.id+' needs a positive range');
    assert.ok(mechanic.damage>=0,hazard.id+' damage cannot be negative');
    if(mechanic.slowMultiplier!==undefined){
      assert.ok(mechanic.slowMultiplier>0&&mechanic.slowMultiplier<1,hazard.id+' slow must be meaningful');
      assert.ok((mechanic.slowDurationMs??0)>0,hazard.id+' slow needs a duration');
    }
    if(mechanic.poisonStacks!==undefined){
      assert.ok(mechanic.poisonStacks>0,hazard.id+' poison needs stacks');
      assert.ok((mechanic.poisonDurationMs??0)>0,hazard.id+' poison needs an expiry');
    }
    if(mechanic.summonEnemyId)assert.ok((mechanic.summonCount??0)>0,hazard.id+' summons need a positive count');
  }
  assert.equal(new Set(profiles.map(profile=>JSON.stringify(profile))).size,20,'each hazard must have its own tuned profile');
});

test('regional hazards preserve their intended signature mechanics',()=>{
  assert.equal(getRegionHazardMechanic('forest-poison-bloom')?.poisonStacks,2);
  assert.equal(getRegionHazardMechanic('forest-thorn-root')?.shape,'line');
  assert.equal(getRegionHazardMechanic('forest-hidden-nest')?.summonCount,2);
  assert.equal(getRegionHazardMechanic('grave-spirit-burst')?.shape,'ring');
  assert.equal(getRegionHazardMechanic('grave-temporary-portal')?.summonEnemyId,'wailing-wisp');
  assert.equal(getRegionHazardMechanic('dungeon-fire-trap')?.damage,16);
  assert.equal(getRegionHazardMechanic('dungeon-moving-machinery')?.pushForce,150);
  assert.equal(getRegionHazardMechanic('swamp-toxic-water')?.poisonStacks,2);
  assert.equal(getRegionHazardMechanic('swamp-slow-mud')?.slowMultiplier,.65);
  assert.equal(getRegionHazardMechanic('castle-dark-flame')?.shape,'line');
  assert.equal(getRegionHazardMechanic('castle-phase-arena')?.radius,138);
  assert.equal(getRegionHazardMechanic('unknown-hazard'),undefined);
});

test('hazard cycle still presents a warning window before the active phase',()=>{
  const region=REGIONS.find(item=>item.id==='cursed-castle');
  const hazard=region.hazards.find(item=>item.id==='castle-phase-arena');
  let cycle=createHazardCycle(0);
  cycle={...cycle,hazardIndex:region.hazards.indexOf(hazard),nextAt:100};
  let result=stepRegionHazard(region,cycle,100);
  assert.equal(result.event.phase,'telegraph');
  result=stepRegionHazard(region,result.cycle,100+hazard.telegraphMs+1);
  assert.equal(result.event.phase,'active');
});
