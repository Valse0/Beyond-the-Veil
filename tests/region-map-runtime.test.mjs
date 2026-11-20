import test from 'node:test';
import assert from 'node:assert/strict';
import { REGION_MAP_LAYOUTS } from '../.test-dist/src/data/region-layouts.js';
import { REGION_PATHS } from '../.test-dist/src/data/region-paths.js';
import { buildRegionMapBoundary, isRegionMapWalkable, resolveRegionMapPosition, validateRegionMapConnectivity } from '../.test-dist/src/data/region-layouts.js';
import { resolveRegionMap } from '../.test-dist/src/gameplay/world/region-map-runtime.js';

test('all five regions have connected organic room-and-corridor layouts',()=>{
  assert.equal(REGION_MAP_LAYOUTS.length,5);
  for(const layout of REGION_MAP_LAYOUTS){
    assert.equal(layout.rooms.length,6,layout.regionId);
    assert.equal(layout.corridors.length,5,layout.regionId);
    assert.equal(validateRegionMapConnectivity(layout),true,layout.regionId);
    assert.ok(isRegionMapWalkable(layout,1200,900,24),layout.regionId+' start room');
    const hidden=layout.rooms.find(room=>room.kind==='hidden');
    assert.ok(hidden,layout.regionId+' hidden room definition');
    assert.ok(isRegionMapWalkable(layout,hidden.x,255),layout.regionId+' hidden room');
    assert.ok(buildRegionMapBoundary(layout).length>100,layout.regionId+' boundary');
    const resolved=resolveRegionMap(layout.regionId);
    assert.equal(resolved.connected,true,layout.regionId+' resolver connectivity');
    assert.ok(resolved.boundary.length>100,layout.regionId+' resolver boundary');
  }
});

test('all existing story gates and destinations resolve to safe walkable map positions',()=>{
  for(const path of REGION_PATHS){
    const layout=REGION_MAP_LAYOUTS.find(item=>item.regionId===path.regionId);
    assert.ok(layout,path.id+' region layout');
    for(const point of [path.entry,path.destination]){
      const safe=resolveRegionMapPosition(layout,point.x,point.y,28);
      assert.ok(isRegionMapWalkable(layout,safe.x,safe.y,28),path.id+' resolved point');
      assert.ok(Math.hypot(safe.x-point.x,safe.y-point.y)<=720,path.id+' reasonable relocation');
    }
  }
});

test('map boundary generation is deterministic and stays within the authored world',()=>{
  for(const layout of REGION_MAP_LAYOUTS){
    const first=buildRegionMapBoundary(layout),second=buildRegionMapBoundary(layout);
    assert.deepEqual(first,second,layout.regionId);
    assert.ok(first.every(point=>point.x>=0&&point.x<=layout.width&&point.y>=0&&point.y<=layout.height));
  }
});
