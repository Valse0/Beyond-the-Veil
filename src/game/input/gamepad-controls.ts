export interface GamepadFrame {
  axisX: number;
  axisY: number;
  dpadLeft: boolean;
  dpadRight: boolean;
  dpadUp: boolean;
  dpadDown: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
  start: boolean;
}

export interface GamepadActions {
  moveX: number;
  moveY: number;
  southPressed: boolean;
  westPressed: boolean;
  eastPressed: boolean;
  startPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
}

export const EMPTY_GAMEPAD_FRAME: GamepadFrame = {
  axisX: 0,
  axisY: 0,
  dpadLeft: false,
  dpadRight: false,
  dpadUp: false,
  dpadDown: false,
  south: false,
  west: false,
  east: false,
  start: false
};

const clampAxis = (value: number): number => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;

export function resolveGamepadInput(
  current: GamepadFrame,
  previous: GamepadFrame = EMPTY_GAMEPAD_FRAME,
  deadzone = 0.2
): GamepadActions {
  let x = clampAxis(current.axisX);
  let y = clampAxis(current.axisY);

  if (current.dpadLeft || current.dpadRight || current.dpadUp || current.dpadDown) {
    x = Number(current.dpadRight) - Number(current.dpadLeft);
    y = Number(current.dpadDown) - Number(current.dpadUp);
  }

  const magnitude = Math.hypot(x, y);
  const safeDeadzone = Math.max(0, Math.min(0.95, deadzone));
  if (magnitude <= safeDeadzone) {
    x = 0;
    y = 0;
  } else {
    const adjustedMagnitude = Math.min(1, (magnitude - safeDeadzone) / (1 - safeDeadzone));
    const scale = adjustedMagnitude / magnitude;
    x *= scale;
    y *= scale;
  }

  return {
    moveX: x,
    moveY: y,
    southPressed: current.south && !previous.south,
    westPressed: current.west && !previous.west,
    eastPressed: current.east && !previous.east,
    startPressed: current.start && !previous.start,
    leftPressed: current.dpadLeft && !previous.dpadLeft,
    rightPressed: current.dpadRight && !previous.dpadRight,
    upPressed: current.dpadUp && !previous.dpadUp,
    downPressed: current.dpadDown && !previous.dpadDown
  };
}
