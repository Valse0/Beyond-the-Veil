import test from 'node:test';
import assert from 'node:assert/strict';
import { REGION_PATHS } from '../.test-dist/src/data/region-paths.js';
import { resolveUnlockedRegionPaths, isRegionPathUnlocked } from '../.test-dist/src/gameplay/world/region-path-runtime.js';

const expected = [
  ['forest-mercy-path','cursed-forest','forest-root-oath','spare-warden'],
  ['forest-heartwood-vault','cursed-forest','forest-root-oath','claim-heartwood'],
  ['grave-silent-gate','forgotten-graveyard','grave-names-unforgotten','release-spirits'],
  ['grave-bone-choir','forgotten-graveyard','grave-names-unforgotten','bind-the-choir'],
  ['dungeon-cooling-shaft','deep-dungeon','dungeon-forge-truth','shut-down-forge'],
  ['dungeon-magma-route','deep-dungeon','dungeon-forge-truth','restart-forge'],
  ['swamp-oracle-sanctum','rotten-swamp','swamp-drowned-vow','free-the-oracle'],
  ['swamp-crown-marsh','rotten-swamp','swamp-drowned-vow','take-the-oracles-place'],
  ['castle-dawn-corridor','cursed-castle','castle-veil-heir','mend-the-veil'],
  ['castle-beyond-gate','cursed-castle','castle-veil-heir','tear-the-veil']
];

test('ten authored story passages map one-to-one to the five main quest branch outcomes',()=>{
  assert.equal(REGION_PATHS.length,10);
  assert.equal(new Set(REGION_PATHS.map(path=>path.id)).size,10);
  assert.deepEqual(REGION_PATHS.map(path=>[path.id,path.regionId,path.questId,path.choiceId]),expected);
  for(const path of REGION_PATHS){
    assert.ok(path.name.length>0&&path.description.length>12,path.id);
    for(const point of [path.entry,path.destination]){
      assert.ok(point.x>=0&&point.x<=2400&&point.y>=0&&point.y<=1800,path.id+' point outside current world');
    }
    assert.notDeepEqual(path.entry,path.destination,path.id+' must lead somewhere');
  }
});

test('only the matching saved choice opens its passage in its own region',()=>{
  for(let i=0;i<expected.length;i+=2){
    const [first,second]=expected.slice(i,i+2);
    const regionId=first[1];
    assert.deepEqual(resolveUnlockedRegionPaths(regionId,[first[0]]).map(path=>path.id),[first[0]]);
    assert.deepEqual(resolveUnlockedRegionPaths(regionId,[second[0]]).map(path=>path.id),[second[0]]);
    assert.equal(isRegionPathUnlocked(first[0],regionId,[second[0]]),false);
    assert.equal(isRegionPathUnlocked(second[0],regionId,[first[0]]),false);
  }
});

test('paths unlocked for another region never appear in the current region',()=>{
  for(const path of REGION_PATHS){
    const otherRegion=REGION_PATHS.find(candidate=>candidate.regionId!==path.regionId).regionId;
    assert.deepEqual(resolveUnlockedRegionPaths(otherRegion,[path.id]),[]);
    assert.equal(isRegionPathUnlocked(path.id,otherRegion,[path.id]),false);
  }
});

test('exploration secret IDs and unknown path IDs are not interpreted as story passages',()=>{
  const discoveryIds=['cursed-forest-secret','forgotten-graveyard-secret','forest-spring-crossing','unlisted-path'];
  for(const regionId of ['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle']){
    assert.deepEqual(resolveUnlockedRegionPaths(regionId,discoveryIds),[]);
  }
});
