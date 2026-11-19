import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../.test-dist/src/data/bosses.js';
import { BOSS_TRACES, getBossTraces } from '../.test-dist/src/data/boss-traces.js';

const expectedMotifs = new Map([
  ['thorn-matriarch', 'root-shrine'],
  ['ossuary-king', 'grave-epitaph'],
  ['furnace-colossus', 'forge-mark'],
  ['mire-oracle', 'oracle-rings'],
  ['unwritten-regent', 'veil-fracture']
]);

test('every authored boss has three stable, region-specific environmental traces', () => {
  assert.equal(BOSS_TRACES.length, 15);
  assert.equal(new Set(BOSS_TRACES.map(trace => trace.id)).size, 15);
  assert.deepEqual(BOSSES.map(boss => boss.id), [...expectedMotifs.keys()]);
  for (const boss of BOSSES) {
    const traces = getBossTraces(boss.id);
    assert.equal(traces.length, 3, boss.id);
    assert.ok(traces.every(trace => trace.motif === expectedMotifs.get(boss.id)), boss.id);
    assert.ok(traces.every(trace => trace.name.length > 4), boss.id);
    assert.ok(traces.every(trace => Number.isInteger(trace.primaryColor) && Number.isInteger(trace.accentColor)), boss.id);
    assert.ok(traces.every(trace => Math.abs(trace.offset.x) <= 240 && Math.abs(trace.offset.y) <= 240), boss.id);
  }
});

test('trace catalog uses explicit IDs and returns no traces for unknown bosses', () => {
  const expectedIds = [
    'matriarch-trace-root-oath', 'matriarch-trace-hunter-mark', 'matriarch-trace-heart-seal',
    'ossuary-trace-erased-names', 'ossuary-trace-last-prayer', 'ossuary-trace-bone-vow',
    'furnace-trace-forgemaster', 'furnace-trace-broken-drive', 'furnace-trace-core-script',
    'oracle-trace-drowned-vow', 'oracle-trace-seeing-eye', 'oracle-trace-sunken-altar',
    'regent-trace-first-script', 'regent-trace-broken-veil', 'regent-trace-empty-crown'
  ];
  assert.deepEqual(BOSS_TRACES.map(trace => trace.id), expectedIds);
  assert.deepEqual(getBossTraces('unknown-boss'), []);
});
