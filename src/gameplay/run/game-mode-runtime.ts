import type { GameMode } from '../../core/types/game.js';

export interface GameModeRules {
  id: GameMode;
  startsBossImmediately: boolean;
  regularWavesEnabled: boolean;
  timedEventsEnabled: boolean;
  storyQuestsEnabled: boolean;
  explorationEnabled: boolean;
  survivalTimeLimitEnabled: boolean;
  fullRunProgressionEnabled: boolean;
}

export const GAME_MODE_RULES: Readonly<Record<GameMode, GameModeRules>> = {
  survival: {
    id: 'survival',
    startsBossImmediately: false,
    regularWavesEnabled: true,
    timedEventsEnabled: true,
    storyQuestsEnabled: true,
    explorationEnabled: true,
    survivalTimeLimitEnabled: true,
    fullRunProgressionEnabled: true
  },
  'boss-hunt': {
    id: 'boss-hunt',
    startsBossImmediately: true,
    regularWavesEnabled: false,
    timedEventsEnabled: false,
    storyQuestsEnabled: false,
    explorationEnabled: false,
    survivalTimeLimitEnabled: false,
    fullRunProgressionEnabled: false
  }
};

export function resolveGameMode(value: unknown): GameMode {
  return value === 'boss-hunt' ? 'boss-hunt' : 'survival';
}

export function getGameModeRules(mode: GameMode): GameModeRules {
  return GAME_MODE_RULES[mode];
}
