import Phaser from 'phaser';
import { createGameConfig } from './game/config/game-config.js';
import { SaveManager } from './systems/save/save-manager.js';
import { BrowserSaveStorage } from './systems/save/save-storage.js';

declare global {
  interface Window {
    __BEYOND_VEIL_GAME__?: Phaser.Game;
  }
}

let game: Phaser.Game | undefined;

function startGame(): void {
  if (game) return;

  let saveManager: SaveManager | undefined;
  let saveLoadStatus = 'unavailable';

  try {
    saveManager = new SaveManager(new BrowserSaveStorage(window.localStorage));
    const result = saveManager.load();
    saveLoadStatus = result.status;
    if (result.status === 'created') saveManager.save(result.data);
  } catch {
    // Storage can be unavailable or full (for example, browser privacy settings).
    // The game must still boot even when persistence cannot be initialized.
    saveManager = undefined;
    saveLoadStatus = 'unavailable';
  }

  game = new Phaser.Game(createGameConfig());
  if (saveManager) game.registry.set('saveManager', saveManager);
  game.registry.set('saveLoadStatus', saveLoadStatus);

  // Test controls exist only on Vite's development server and require an explicit URL flag.
  // Production builds never expose the Phaser instance or enable the test registry flag.
  const browserTestMode = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('bv-test') === '1';
  if (browserTestMode) {
    game.registry.set('browserTestMode', true);
    window.__BEYOND_VEIL_GAME__ = game;
  }
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', startGame, { once: true });
else startGame();
