import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '../.test-dist/src/data/regions.js';
import { ENVIRONMENTAL_LORE_LANDMARKS, getEnvironmentalLoreLandmark } from '../.test-dist/src/data/environmental-lore.js';

const regionIds = ['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];

test('environmental lore defines two themed landmarks for every region', () => {
  assert.equal(ENVIRONMENTAL_LORE_LANDMARKS.length, 10);
  assert.deepEqual([...new Set(ENVIRONMENTAL_LORE_LANDMARKS.map(item => item.regionId))], regionIds);
  for (const regionId of regionIds) {
    const region = REGIONS.find(item => item.id === regionId);
    assert.ok(region);
    for (const kind of ['lore', 'secret']) {
      const landmark = getEnvironmentalLoreLandmark(regionId, kind);
      assert.ok(landmark, `missing ${kind} landmark for ${regionId}`);
      assert.equal(landmark.id, region.explorationPoints[kind === 'lore' ? 0 : 1].id);
      assert.ok(landmark.name.length > 4);
      assert.ok(landmark.description.length > 20);
      assert.ok(Number.isInteger(landmark.primaryColor));
      assert.ok(Number.isInteger(landmark.accentColor));
    }
  }
});

test('landmark IDs and motif definitions are unique and use supported visual motifs', () => {
  assert.equal(new Set(ENVIRONMENTAL_LORE_LANDMARKS.map(item => item.id)).size, 10);
  const motifs = new Set(['forest-camp','grave-etching','dungeon-workshop','swamp-altar','castle-seal']);
  for (const landmark of ENVIRONMENTAL_LORE_LANDMARKS) assert.ok(motifs.has(landmark.motif), landmark.id);
  assert.equal(getEnvironmentalLoreLandmark('cursed-forest', 'unknown'), undefined);
});
