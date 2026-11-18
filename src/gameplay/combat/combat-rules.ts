import type { Position } from '../../core/types/game.js';
export function distanceSquared(a: Position, b: Position): number {
  const x = a.x - b.x; const y = a.y - b.y; return x * x + y * y;
}
export function findNearestTarget<T extends Position>(origin: Position, targets: readonly T[]): T | undefined {
  let result: T | undefined; let best = Number.POSITIVE_INFINITY;
  for (const target of targets) { const d = distanceSquared(origin, target); if (d < best) { best = d; result = target; } }
  return result;
}
export function calculateDamage(base: number, multiplier = 1): number {
  return Math.max(1, Math.round(Math.max(0, base) * Math.max(0, multiplier)));
}
