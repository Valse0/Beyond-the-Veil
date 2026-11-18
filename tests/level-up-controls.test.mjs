import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLevelUpControlState,
  drawLevelUpChoices,
  spendLevelUpBanish,
  spendLevelUpReroll,
  spendLevelUpSkip
} from '../.test-dist/src/gameplay/level-up/level-up-controls.js';

const choices = Array.from({ length: 12 }, (_, index) => ({ id: 'choice-' + index }));

test('each run starts with two rerolls, one banish and one skip', () => {
  assert.deepEqual(createLevelUpControlState(), {
    rerollsRemaining: 2,
    banishesRemaining: 1,
    skipsRemaining: 1,
    bannedChoiceIds: []
  });
});

test('choice draws return up to four unique, non-banned choices', () => {
  const state = { ...createLevelUpControlState(), bannedChoiceIds: ['choice-0'] };
  const drawn = drawLevelUpChoices(choices, state, () => 0.5);
  assert.equal(drawn.length, 4);
  assert.equal(new Set(drawn.map(choice => choice.id)).size, 4);
  assert.equal(drawn.some(choice => choice.id === 'choice-0'), false);
});

test('reroll spends exactly one charge and cannot go below zero', () => {
  const initial = createLevelUpControlState();
  const once = spendLevelUpReroll(initial);
  assert.equal(once?.rerollsRemaining, 1);
  const twice = spendLevelUpReroll(once!);
  assert.equal(twice?.rerollsRemaining, 0);
  assert.equal(spendLevelUpReroll(twice!), null);
  assert.equal(initial.rerollsRemaining, 2);
});

test('reroll can draw a fresh set without repeating the visible choices', () => {
  const state = createLevelUpControlState();
  const first = drawLevelUpChoices(choices, state, () => 0.1);
  const rerolledState = spendLevelUpReroll(state)!;
  const next = drawLevelUpChoices(choices, rerolledState, () => 0.8, first.map(choice => choice.id));
  assert.equal(next.length, 4);
  assert.equal(next.some(choice => first.some(old => old.id === choice.id)), false);
});

test('banish records one stable id and removes it from future draws', () => {
  const state = createLevelUpControlState();
  const next = spendLevelUpBanish(state, 'choice-3');
  assert.equal(next?.banishesRemaining, 0);
  assert.deepEqual(next?.bannedChoiceIds, ['choice-3']);
  assert.equal(drawLevelUpChoices(choices, next!, () => 0.3).some(choice => choice.id === 'choice-3'), false);
  assert.equal(spendLevelUpBanish(next!, 'choice-4'), null);
  assert.equal(spendLevelUpBanish(state, 'choice-3')?.bannedChoiceIds.length, 1);
});

test('skip is limited to one use and does not modify the build-choice ban list', () => {
  const state = createLevelUpControlState();
  const skipped = spendLevelUpSkip(state);
  assert.equal(skipped?.skipsRemaining, 0);
  assert.deepEqual(skipped?.bannedChoiceIds, []);
  assert.equal(spendLevelUpSkip(skipped!), null);
  assert.equal(state.skipsRemaining, 1);
});

test('drawing with an empty pool is safe and does not mutate candidates', () => {
  const source = choices.slice(0, 4);
  const snapshot = [...source];
  const drawn = drawLevelUpChoices(source, createLevelUpControlState(), () => Number.NaN, source.map(choice => choice.id));
  assert.deepEqual(drawn, []);
  assert.deepEqual(source, snapshot);
});
