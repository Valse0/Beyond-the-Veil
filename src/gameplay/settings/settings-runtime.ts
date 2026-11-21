import type { JsonObject, SaveData } from '../../systems/save/save-types.js';

export interface GameSettings {
  screenShake: boolean;
  screenFlash: boolean;
  damageNumbers: boolean;
  touchControlsVisible: boolean;
  touchControlScale: 0.85 | 1 | 1.15;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  screenShake: true,
  screenFlash: true,
  damageNumbers: false,
  touchControlsVisible: true,
  touchControlScale: 1
};

export function normalizeGameSettings(value: unknown): GameSettings {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const scale = source.touchControlScale;
  return {
    screenShake: typeof source.screenShake === 'boolean' ? source.screenShake : DEFAULT_GAME_SETTINGS.screenShake,
    screenFlash: typeof source.screenFlash === 'boolean' ? source.screenFlash : DEFAULT_GAME_SETTINGS.screenFlash,
    damageNumbers: typeof source.damageNumbers === 'boolean' ? source.damageNumbers : DEFAULT_GAME_SETTINGS.damageNumbers,
    touchControlsVisible: typeof source.touchControlsVisible === 'boolean' ? source.touchControlsVisible : DEFAULT_GAME_SETTINGS.touchControlsVisible,
    touchControlScale: scale === 0.85 || scale === 1.15 ? scale : 1
  };
}

export function readGameSettings(save: Pick<SaveData, 'settings'> | null | undefined): GameSettings {
  return normalizeGameSettings(save?.settings);
}

export function updateGameSettings(data: SaveData, patch: Partial<GameSettings>): SaveData {
  const current = normalizeGameSettings(data.settings);
  const next = normalizeGameSettings({ ...current, ...patch });
  return { ...data, settings: { ...data.settings, ...next } as JsonObject };
}
