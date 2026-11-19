import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { completeEnding } from '../.test-dist/src/gameplay/endings/ending-runtime.js';

function withChoice(choiceId) {
  const save = createInitialSaveData('2026-11-19T00:00:00.000Z');
  const chosen = choiceId === 'mend-the-veil'
    ? { choiceId, outcomeId: 'veil-mended', endingId: 'ending-mended-veil', pathId: 'castle-dawn-corridor', bossVariantId: 'unwritten-regent-sealed' }
    : { choiceId, outcomeId: 'veil-torn', endingId: 'ending-beyond-veil', pathId: 'castle-beyond-gate', bossVariantId: 'unwritten-regent-unbound' };
  save.story.quests['castle-veil-heir'] = {
    status: 'completed',
    objectiveProgress: { 'decode-regent-seals': 3, 'face-veil-echoes': 3 },
    chosenChoiceId: chosen.choiceId,
    outcomeId: chosen.outcomeId
  };
  save.story.endingId = chosen.endingId;
  save.story.unlockedPathIds.push(chosen.pathId);
  save.story.bossEncounterIds.push(chosen.bossVariantId);
  save.story.appliedOutcomeIds.push(chosen.outcomeId);
  return save;
}

test('completes the mended-veil ending only after the Unwritten Regent victory in the Cursed Castle', () => {
  const save = withChoice('mend-the-veil');
  const completed = completeEnding(save, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true });
  assert.equal(completed.story.completedEndingId, 'ending-mended-veil');
  assert.equal(save.story.completedEndingId, null);
});

test('completes the beyond-veil ending from its own saved branch', () => {
  const completed = completeEnding(withChoice('tear-the-veil'), { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true });
  assert.equal(completed.story.completedEndingId, 'ending-beyond-veil');
});

test('does not complete an ending on defeat, wrong region, or wrong boss', () => {
  const save = withChoice('mend-the-veil');
  assert.equal(completeEnding(save, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: false }), save);
  assert.equal(completeEnding(save, { regionId: 'rotten-swamp', bossId: 'unwritten-regent', victory: true }), save);
  assert.equal(completeEnding(save, { regionId: 'cursed-castle', bossId: 'mire-oracle', victory: true }), save);
});

test('requires a completed final quest and consistent saved choice/outcome/ending linkage', () => {
  const incomplete = withChoice('mend-the-veil');
  incomplete.story.quests['castle-veil-heir'].status = 'active';
  assert.equal(completeEnding(incomplete, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true }), incomplete);

  const mismatch = withChoice('mend-the-veil');
  mismatch.story.endingId = 'ending-beyond-veil';
  assert.equal(completeEnding(mismatch, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true }), mismatch);
});

test('completed ending is immutable and repeated completion is idempotent', () => {
  const save = withChoice('mend-the-veil');
  save.story.completedEndingId = 'ending-mended-veil';
  assert.equal(completeEnding(save, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true }), save);
  assert.equal(completeEnding(save, { regionId: 'cursed-castle', bossId: 'unwritten-regent', victory: true }).story.completedEndingId, 'ending-mended-veil');
});
