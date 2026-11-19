import test from 'node:test';
import assert from 'node:assert/strict';
import { RELICS } from '../.test-dist/src/data/relics.js';
import { deriveRelicStats, equipRelic, getRelicDamageMultiplier, unequipRelic } from '../.test-dist/src/gameplay/relics/relic-runtime.js';

test('defines five boss relics and five exploration relics with complete regional coverage', () => {
  assert.equal(RELICS.length, 10);
  assert.equal(RELICS.filter(relic => relic.source === 'boss').length, 5);
  assert.equal(RELICS.filter(relic => relic.source === 'exploration').length, 5);
  for (const regionId of ['cursed-forest', 'forgotten-graveyard', 'deep-dungeon', 'rotten-swamp', 'cursed-castle']) {
    const regional = RELICS.filter(relic => relic.regionId === regionId);
    assert.equal(regional.length, 2);
    assert.deepEqual(new Set(regional.map(relic => relic.source)), new Set(['boss', 'exploration']));
  }
  assert.ok(RELICS.every(relic => ['rare', 'epic', 'legendary'].includes(relic.rarity)));
});

test('equipment requires ownership, rejects duplicates and keeps exactly three slots maximum', () => {
  const owned = ['matriarch-seed', 'forest-heart', 'king-crown-shard', 'grave-lament'];
  assert.equal(equipRelic(owned, [], 'unknown-relic'), null);
  assert.deepEqual(equipRelic(owned, [], 'matriarch-seed'), ['matriarch-seed']);
  assert.equal(equipRelic(owned, ['matriarch-seed'], 'matriarch-seed'), null);
  assert.deepEqual(equipRelic(owned, ['matriarch-seed'], 'forest-heart'), ['matriarch-seed', 'forest-heart']);
  assert.deepEqual(equipRelic(owned, ['matriarch-seed', 'forest-heart'], 'king-crown-shard'), ['matriarch-seed', 'forest-heart', 'king-crown-shard']);
  assert.equal(equipRelic(owned, ['matriarch-seed', 'forest-heart', 'king-crown-shard'], 'grave-lament'), null);
  assert.deepEqual(equipRelic(owned, ['matriarch-seed', 'forest-heart', 'king-crown-shard'], 'grave-lament', 1), ['matriarch-seed', 'grave-lament', 'king-crown-shard']);
  assert.deepEqual(unequipRelic(['matriarch-seed', 'forest-heart'], 'matriarch-seed'), ['forest-heart']);
});

test('two matching regional relics activate a set bonus and character affinity', () => {
  const single = deriveRelicStats(['matriarch-seed'], 'cursed-hunter');
  const pair = deriveRelicStats(['matriarch-seed', 'forest-heart'], 'cursed-hunter');
  const affinity = deriveRelicStats(['matriarch-seed'], 'blood-priestess');
  assert.ok(pair.damageMultiplier > single.damageMultiplier);
  assert.ok(affinity.lifestealBonus > single.lifestealBonus);
});

test('element-bound relic damage only amplifies its matching element', () => {
  const equipped = ['forest-heart'];
  assert.ok(getRelicDamageMultiplier(equipped, 'cursed-hunter', 'poison') > 1);
  assert.equal(getRelicDamageMultiplier(equipped, 'cursed-hunter', 'fire'), 1);
});

test('unknown, unowned and repeated IDs cannot inflate derived stats', () => {
  const stats = deriveRelicStats(['matriarch-seed', 'matriarch-seed', 'unknown-relic'], 'cursed-hunter');
  const one = deriveRelicStats(['matriarch-seed'], 'cursed-hunter');
  assert.deepEqual(stats, one);
});
