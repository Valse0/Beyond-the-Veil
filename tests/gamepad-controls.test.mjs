import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_GAMEPAD_FRAME, resolveGamepadInput } from '../.test-dist/src/game/input/gamepad-controls.js';

test('left stick applies a radial deadzone and keeps analog magnitude', () => {
  const quiet = resolveGamepadInput({ ...EMPTY_GAMEPAD_FRAME, axisX: 0.1, axisY: 0.1 });
  assert.deepEqual([quiet.moveX, quiet.moveY], [0, 0]);

  const moving = resolveGamepadInput({ ...EMPTY_GAMEPAD_FRAME, axisX: 0.6, axisY: 0 });
  assert.ok(moving.moveX > 0.45 && moving.moveX < 0.51);
  assert.equal(moving.moveY, 0);
});

test('diagonal d-pad movement is normalized and overrides stick drift', () => {
  const result = resolveGamepadInput({
    ...EMPTY_GAMEPAD_FRAME,
    axisX: 0.8,
    dpadRight: true,
    dpadDown: true
  });
  assert.ok(Math.abs(Math.hypot(result.moveX, result.moveY) - 1) < 1e-9);
  assert.ok(result.moveX > 0 && result.moveY > 0);
});

test('action buttons trigger once per press and can trigger again after release', () => {
  const held = { ...EMPTY_GAMEPAD_FRAME, south: true, west: true, start: true };
  const first = resolveGamepadInput(held);
  assert.equal(first.southPressed, true);
  assert.equal(first.westPressed, true);
  assert.equal(first.startPressed, true);

  const repeated = resolveGamepadInput(held, held);
  assert.equal(repeated.southPressed, false);
  assert.equal(repeated.westPressed, false);
  assert.equal(repeated.startPressed, false);

  const pressedAgain = resolveGamepadInput(held, EMPTY_GAMEPAD_FRAME);
  assert.equal(pressedAgain.southPressed, true);
});

test('d-pad navigation uses press edges rather than repeating while held', () => {
  const held = { ...EMPTY_GAMEPAD_FRAME, dpadLeft: true };
  assert.equal(resolveGamepadInput(held).leftPressed, true);
  assert.equal(resolveGamepadInput(held, held).leftPressed, false);
});

test('non-finite axes are treated as neutral input', () => {
  const result = resolveGamepadInput({ ...EMPTY_GAMEPAD_FRAME, axisX: Number.NaN, axisY: Number.POSITIVE_INFINITY });
  assert.deepEqual([result.moveX, result.moveY], [0, 0]);
});

test('left-stick directions navigate once when crossing the menu threshold', () => {
  const tilted = { ...EMPTY_GAMEPAD_FRAME, axisX: -0.8 };
  assert.equal(resolveGamepadInput(tilted).leftPressed, true);
  assert.equal(resolveGamepadInput(tilted, tilted).leftPressed, false);
});
