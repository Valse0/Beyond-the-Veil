import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { PASSIVES } from '../.test-dist/src/data/passives.js';
import {
  WEAPON_SYNERGIES,
  getActiveWeaponSynergies,
  getWeaponSynergyDamageMultiplier,
  getWeaponSynergyChainBonus
} from '../.test-dist/src/gameplay/weapons/weapon-synergies.js';

test('every authored passive-to-weapon transform is represented by one executable synergy', () => {
  const authoredPairs = PASSIVES.flatMap(passive => passive.transformsWeaponIds.map(weaponId => passive.id + ':' + weaponId)).sort();
  const runtimePairs = WEAPON_SYNERGIES.map(synergy => synergy.passiveId + ':' + synergy.weaponId).sort();
  assert.deepEqual(runtimePairs, authoredPairs);
  assert.equal(WEAPON_SYNERGIES.length, 14);
  assert.equal(new Set(WEAPON_SYNERGIES.map(synergy => synergy.id)).size, WEAPON_SYNERGIES.length);
});

test('all twelve weapons have at least one distinct passive synergy', () => {
  assert.equal(WEAPONS.length, 12);
  const covered = new Set(WEAPON_SYNERGIES.map(synergy => synergy.weaponId));
  for (const weapon of WEAPONS) assert.ok(covered.has(weapon.id), weapon.id + ' needs a passive synergy');
});

test('synergies activate as soon as the linked passive is owned and never mutate catalog data', () => {
  for (const synergy of WEAPON_SYNERGIES) {
    assert.deepEqual(getActiveWeaponSynergies(synergy.weaponId, []), []);
    const active = getActiveWeaponSynergies(synergy.weaponId, [synergy.passiveId]);
    assert.equal(active.length, 1);
    assert.equal(active[0].id, synergy.id);
  }
  const before = structuredClone(PASSIVES);
  getActiveWeaponSynergies('eclipse-sigil', ['veil-thread', 'hollow-crown']);
  assert.deepEqual(PASSIVES, before);
});

test('the oath pike and stormglass synergies add executable lightning chain hops', () => {
  assert.equal(getWeaponSynergyChainBonus('oath-pike', ['storm-conductor']), 2);
  assert.equal(getWeaponSynergyChainBonus('stormglass', ['storm-conductor']), 2);
  assert.equal(getWeaponSynergyChainBonus('veil-bolt', ['soul-vessel']), 0);
});

test('the two crown synergies increase only their linked weapon damage against weakened targets', () => {
  assert.equal(getWeaponSynergyDamageMultiplier('eclipse-sigil', ['hollow-crown'], true), 1.25);
  assert.equal(getWeaponSynergyDamageMultiplier('soul-lantern', ['hollow-crown'], true), 1.2);
  assert.equal(getWeaponSynergyDamageMultiplier('eclipse-sigil', ['hollow-crown'], false), 1);
  assert.equal(getWeaponSynergyDamageMultiplier('veil-bolt', ['hollow-crown'], true), 1);
});

test('each synergy has a readable combat trigger and a distinct runtime mechanic', () => {
  const kinds = new Set();
  for (const synergy of WEAPON_SYNERGIES) {
    assert.ok(synergy.name.length > 0, synergy.id + ' needs a name');
    assert.ok(synergy.description.length > 0, synergy.id + ' needs a player-facing explanation');
    assert.ok(synergy.trigger.length > 0, synergy.id + ' needs a combat trigger');
    assert.ok(synergy.kind.length > 0, synergy.id + ' needs a runtime mechanic');
    kinds.add(synergy.kind);
  }
  assert.equal(kinds.size, WEAPON_SYNERGIES.length, 'every weapon/passive pairing should have its own mechanic');
});

test('the full 12-by-12 weapon/passive matrix activates only the 14 authored pairs', () => {
  assert.equal(WEAPONS.length, 12);
  assert.equal(PASSIVES.length, 12);
  assert.equal(WEAPONS.length * PASSIVES.length, 144);
  const authored = new Set(WEAPON_SYNERGIES.map(item => item.weaponId + ':' + item.passiveId));
  let checked = 0;
  for (const weapon of WEAPONS) for (const passive of PASSIVES) {
    const pair = weapon.id + ':' + passive.id;
    const active = getActiveWeaponSynergies(weapon.id, [passive.id]);
    assert.equal(active.length, authored.has(pair) ? 1 : 0, pair + ' activation mismatch');
    if (authored.has(pair)) assert.equal(active[0].weaponId + ':' + active[0].passiveId, pair);
    checked++;
  }
  assert.equal(checked, 144);
  assert.equal(authored.size, 14);
});
