import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRunEvent,
  createRunEventState,
  getRunEventReward,
  recordRunEventAction,
  startDueRunEvent
} from '../.test-dist/src/gameplay/events/run-events.js';

test('each run selects three distinct events deterministically from its seed', () => {
  const first = createRunEventState(12345);
  assert.deepEqual(createRunEventState(12345), first);
  assert.equal(first.selectedEvents.length, 3);
  assert.equal(new Set(first.selectedEvents).size, 3);
  assert.notDeepEqual(createRunEventState(12346).selectedEvents, first.selectedEvents);
});

test('events start only in the three authored windows and never overlap', () => {
  let state = createRunEventState(5);
  assert.equal(startDueRunEvent(state, 209999), state);
  state = startDueRunEvent(state, 210000);
  assert.equal(state.nextEventIndex, 1);
  assert.equal(state.activeEvent?.status, 'active');
  assert.equal(startDueRunEvent(state, 450000), state, 'an active event blocks the next event');
  state = advanceRunEvent(state, state.activeEvent.deadlineAtMs);
  state = startDueRunEvent(state, 450000);
  assert.equal(state.nextEventIndex, 2);
});

test('elite invasion rewards exactly two event elite kills', () => {
  let state = createRunEventState(1);
  state = { ...state, selectedEvents: ['elite-invasion', 'spirit-storm', 'treasure-hunt'] };
  state = startDueRunEvent(state, 210000);
  state = recordRunEventAction(state, 'collect');
  assert.equal(state.activeEvent?.progress, 0);
  state = recordRunEventAction(state, 'kill');
  assert.equal(state.activeEvent?.status, 'active');
  state = recordRunEventAction(state, 'kill');
  assert.equal(state.activeEvent?.status, 'completed');
  assert.equal(getRunEventReward('elite-invasion'), 100);
});

test('spirit storm requires four fragments and treasure hunt requires the chest', () => {
  let spirit = createRunEventState(2);
  spirit = { ...spirit, selectedEvents: ['spirit-storm', 'treasure-hunt', 'hunter-trial'] };
  spirit = startDueRunEvent(spirit, 210000);
  spirit = recordRunEventAction(spirit, 'collect', 3);
  assert.equal(spirit.activeEvent?.status, 'active');
  spirit = recordRunEventAction(spirit, 'collect');
  assert.equal(spirit.activeEvent?.status, 'completed');

  let treasure = createRunEventState(3);
  treasure = { ...treasure, selectedEvents: ['treasure-hunt', 'spirit-storm', 'hunter-trial'] };
  treasure = startDueRunEvent(treasure, 210000);
  treasure = recordRunEventAction(treasure, 'collect');
  assert.equal(treasure.activeEvent?.status, 'active');
  treasure = recordRunEventAction(treasure, 'treasure');
  assert.equal(treasure.activeEvent?.status, 'completed');
  assert.equal(getRunEventReward('treasure-hunt'), 90);
});

test('hunter trial needs six kills and cursed wave needs three cleared stages', () => {
  let trial = createRunEventState(4);
  trial = { ...trial, selectedEvents: ['hunter-trial', 'spirit-storm', 'treasure-hunt'] };
  trial = startDueRunEvent(trial, 210000);
  trial = recordRunEventAction(trial, 'kill', 5);
  assert.equal(trial.activeEvent?.status, 'active');
  trial = recordRunEventAction(trial, 'kill');
  assert.equal(trial.activeEvent?.status, 'completed');

  let cursed = createRunEventState(6);
  cursed = { ...cursed, selectedEvents: ['cursed-wave', 'spirit-storm', 'treasure-hunt'] };
  cursed = startDueRunEvent(cursed, 210000);
  for (let stage = 1; stage <= 3; stage += 1) {
    cursed = recordRunEventAction(cursed, 'kill', 3);
    if (stage < 3) {
      assert.equal(cursed.activeEvent?.stage, stage + 1);
      assert.equal(cursed.activeEvent?.progress, 0);
      assert.equal(cursed.activeEvent?.status, 'active');
    }
  }
  assert.equal(cursed.activeEvent?.status, 'completed');
  assert.equal(getRunEventReward('cursed-wave'), 85);
});

test('events fail at their deadline and ignore late actions', () => {
  let state = createRunEventState(7);
  state = startDueRunEvent(state, 210000);
  state = advanceRunEvent(state, state.activeEvent.deadlineAtMs);
  assert.equal(state.activeEvent?.status, 'failed');
  const failed = recordRunEventAction(state, 'kill', 10);
  assert.equal(failed.activeEvent?.progress, 0);
  assert.deepEqual(failed.failedEvents, [state.activeEvent.kind]);
});
