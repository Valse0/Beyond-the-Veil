import Phaser from 'phaser';
import { createGameConfig } from './game/config/game-config.js';
import { SaveManager } from './systems/save/save-manager.js';
import { BrowserSaveStorage } from './systems/save/save-storage.js';

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
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', startGame, { once: true });
else startGame();
