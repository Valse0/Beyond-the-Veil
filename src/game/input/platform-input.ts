export type RemoteAction = 'back' | 'confirm' | 'red' | 'green' | 'yellow' | 'blue';

export interface RemoteKeyboardEvent {
  key: string;
  code?: string;
  keyCode?: number;
}

/**
 * Normalizes smart-TV browser remote events.
 * Arrows, Enter, Escape and Backspace stay on their existing keyboard paths.
 */
export function resolveRemoteAction(event: RemoteKeyboardEvent): RemoteAction | null {
  const key = (event.key ?? '').toLowerCase();
  const code = (event.code ?? '').toLowerCase();
  const value = key || code;

  if (['browserback', 'goback', 'back', 'xf86back'].includes(value) ||
      ['browserback', 'goback', 'back', 'xf86back'].includes(code) ||
      event.keyCode === 166) return 'back';
  if (['ok', 'accept', 'select'].includes(value)) return 'confirm';
  if (['colorf0red', 'red'].includes(value) || code === 'colorf0red') return 'red';
  if (['colorf1green', 'green'].includes(value) || code === 'colorf1green') return 'green';
  if (['colorf2yellow', 'yellow'].includes(value) || code === 'colorf2yellow') return 'yellow';
  if (['colorf3blue', 'blue'].includes(value) || code === 'colorf3blue') return 'blue';
  return null;
}
