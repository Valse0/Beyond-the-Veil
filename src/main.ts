import Phaser from 'phaser';
import { createGameConfig } from './game/config/game-config.js';
let game: Phaser.Game | undefined;
function startGame(): void { if (!game) game = new Phaser.Game(createGameConfig()); }
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', startGame, { once: true });
else startGame();
