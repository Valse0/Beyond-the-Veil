import test from 'node:test';
import assert from 'node:assert/strict';
import { REGION_ENVIRONMENT_PROFILES } from '../.test-dist/src/data/environment-profiles.js';
import { GAME_DAY_MS, DAY_PHASE_MS, WEATHER_PHASE_MS, resolveEnvironment, getElementWeatherMultiplier } from '../.test-dist/src/gameplay/world/environment-runtime.js';
import { applyElementHit } from '../.test-dist/src/gameplay/elements/element-runtime.js';
import { ELEMENTS } from '../.test-dist/src/data/elements.js';

const regions=['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];
test('every region has its own authored weather cycle',()=>{
  assert.equal(REGION_ENVIRONMENT_PROFILES.length,5);
  for(const id of regions){
    const profile=REGION_ENVIRONMENT_PROFILES.find(item=>item.regionId===id);
    assert.ok(profile,id);
    assert.ok(profile.weatherCycle.length>=3);
  }
  assert.deepEqual(REGION_ENVIRONMENT_PROFILES.find(item=>item.regionId==='deep-dungeon').weatherCycle,['dry','ashfall','steam']);
  assert.deepEqual(REGION_ENVIRONMENT_PROFILES.find(item=>item.regionId==='cursed-castle').weatherCycle,['fog','snow','storm','clear']);
});
test('the accelerated day has four deterministic phases and wraps after sixteen minutes',()=>{
  assert.equal(GAME_DAY_MS,960000);
  assert.equal(DAY_PHASE_MS,240000);
  assert.deepEqual([0,1,2,3].map(i=>resolveEnvironment('cursed-forest',i*DAY_PHASE_MS).timeOfDay),['dawn','day','sunset','night']);
  assert.equal(resolveEnvironment('cursed-forest',GAME_DAY_MS).timeOfDay,'dawn');
  assert.equal(resolveEnvironment('cursed-forest',-100).timeOfDay,'dawn');
});
test('weather transitions every four run minutes and repeats deterministically',()=>{
  assert.equal(WEATHER_PHASE_MS,240000);
  const profile=REGION_ENVIRONMENT_PROFILES.find(item=>item.regionId==='cursed-forest');
  const sequence=[0,1,2,3,4].map(i=>resolveEnvironment('cursed-forest',i*WEATHER_PHASE_MS).weather);
  assert.deepEqual(sequence,['clear','rain','fog','storm','clear']);
  assert.equal(resolveEnvironment('cursed-forest',2*WEATHER_PHASE_MS).weather,profile.weatherCycle[2]);
});
test('night slightly increases normal enemy movement only',()=>{
  assert.equal(resolveEnvironment('forgotten-graveyard',0).enemyMoveSpeedMultiplier,1);
  assert.equal(resolveEnvironment('forgotten-graveyard',3*DAY_PHASE_MS).enemyMoveSpeedMultiplier,1.04);
});
test('regional weather applies bounded elemental damage modifiers',()=>{
  const rain=resolveEnvironment('cursed-forest',DAY_PHASE_MS);
  const storm=resolveEnvironment('cursed-forest',3*DAY_PHASE_MS);
  const snow=resolveEnvironment('cursed-castle',DAY_PHASE_MS);
  const ash=resolveEnvironment('deep-dungeon',DAY_PHASE_MS);
  assert.equal(getElementWeatherMultiplier(rain,'fire'),.92);
  assert.equal(getElementWeatherMultiplier(rain,'lightning'),1.08);
  assert.equal(getElementWeatherMultiplier(storm,'lightning'),1.16);
  assert.equal(getElementWeatherMultiplier(snow,'ice'),1.12);
  assert.equal(getElementWeatherMultiplier(ash,'fire'),1.08);
  assert.equal(getElementWeatherMultiplier(rain,'dark'),1);
});
test('weather damage modifiers also scale reaction damage while default element hits stay unchanged',()=>{
  const fire=ELEMENTS.find(item=>item.id==='fire');
  const iceState={ice:{buildup:0,stacks:1,expiresAt:5000,nextTickAt:1000}};
  const normal=applyElementHit(iceState,fire,100,0,1000,ELEMENTS);
  const rain=applyElementHit(iceState,fire,100,0,1000,ELEMENTS,.92);
  assert.equal(normal.damage,100);
  assert.equal(rain.damage,92);
  assert.equal(rain.reaction.damage,Math.round(normal.reaction.damage*.92));
});
