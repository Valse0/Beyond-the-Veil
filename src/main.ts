import Phaser from 'phaser';

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load placeholder graphics or assets here
  }

  create() {
    const { width, height } = this.scale;
    
    // Dark fantasy atmospheric background tint
    this.cameras.main.setBackgroundColor('#12121a');

    this.add.text(width / 2, height / 2 - 50, 'BEYOND THE VEIL', {
      fontFamily: 'serif',
      fontSize: '48px',
      color: '#d4af37',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'Dark Fantasy Action Roguelite', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#8b8b9e',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 80, 'Engine Initialized — Ready for Production', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#4ade80',
      align: 'center'
    }).setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#0b0b0f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
