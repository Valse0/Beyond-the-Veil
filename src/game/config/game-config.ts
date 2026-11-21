import Phaser from 'phaser';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene.js';
import { CharacterDetailScene } from '../scenes/CharacterDetailScene.js';
import { RegionSelectScene } from '../scenes/RegionSelectScene.js';
import { RunPreparationScene } from '../scenes/RunPreparationScene.js';
import { HunterHubScene } from '../scenes/HunterHubScene.js';
import { RunScene } from '../scenes/RunScene.js';
import { QuestJournalScene } from '../scenes/QuestJournalScene.js';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#0b0b10',
    pixelArt: true,
    input: { gamepad: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound: true },
    scene: [MainMenuScene, CharacterSelectScene, CharacterDetailScene, RegionSelectScene, RunPreparationScene, HunterHubScene, RunScene, QuestJournalScene]
  };
}
