import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAddChallengeWeapon,
  getChallengeDefinition,
  getChallengeModifiers,
  getChallengeVictoryBonus,
  resolveChallengeId
} from '../.test-dist/src/gameplay/run/challenge-runtime.js';

test('the three authored challenges resolve to distinct rules', () => {
  assert.deepEqual(
    ['limited-arsenal', 'glass-oath', 'hunters-nightmare'].map(resolveChallengeId),
    ['limited-arsenal', 'glass-oath', 'hunters-nightmare']
  );
  assert.equal(getChallengeDefinition('limited-arsenal')?.maxWeaponSlots, 3);
  assert.equal(getChallengeModifiers('glass-oath').maxHealthMultiplier, 0.6);
  assert.equal(getChallengeModifiers('hunters-nightmare').enemyMoveSpeedMultiplier, 1.2);
  assert.equal(getChallengeModifiers('hunters-nightmare').victorySoulEssenceBonus, 200);
});

test('unknown challenge IDs are rejected and resolve to neutral modifiers', () => {
  assert.equal(resolveChallengeId('unknown'), null);
  assert.equal(getChallengeDefinition('unknown'), null);
  assert.deepEqual(getChallengeModifiers(null), {
    maxWeaponSlots: 6, maxHealthMultiplier: 1,
    enemyMoveSpeedMultiplier: 1, victorySoulEssenceBonus: 0
  });
});

test('Limited Arsenal prevents adding a fourth weapon but permits the third', () => {
  assert.equal(canAddChallengeWeapon('limited-arsenal', 2), true);
  assert.equal(canAddChallengeWeapon('limited-arsenal', 3), false);
  assert.equal(canAddChallengeWeapon('limited-arsenal', 6), false);
  assert.equal(canAddChallengeWeapon(null, 5), true);
  assert.equal(canAddChallengeWeapon(null, -1), false);
});

test('challenge bonus requires a valid challenge, victory and opened boss chest', () => {
  assert.equal(getChallengeVictoryBonus('glass-oath', false, true), 0);
  assert.equal(getChallengeVictoryBonus('glass-oath', true, false), 0);
  assert.equal(getChallengeVictoryBonus(null, true, true), 0);
  assert.equal(getChallengeVictoryBonus('hunters-nightmare', true, true), 200);
});
