import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  private previousPadConfirm = false;

  constructor() { super('main-menu'); }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b0b10');

    const art = this.add.graphics();
    art.fillStyle(0x17131c, 1); art.fillCircle(w * 0.72, h * 0.48, 260);
    art.fillStyle(0x30202a, 0.55); art.fillCircle(w * 0.72, h * 0.48, 170);
    art.lineStyle(2, 0xb89a61, 0.32); art.strokeCircle(w * 0.72, h * 0.48, 230);
    art.lineBetween(w * 0.58, h * 0.8, w * 0.86, h * 0.18);

    this.add.text(74, 82, 'BEYOND', {
      fontFamily: 'Georgia, serif', fontSize: '58px', color: '#e9dfcb',
      fontStyle: 'bold', letterSpacing: 5
    });
    this.add.text(78, 145, 'THE VEIL', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#b99a61', letterSpacing: 11
    });
    this.add.text(80, 220, 'Ölümün ötesinde, av başlar.', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#a9a0a0'
    });

    const play = this.add.text(82, h - 185, '▶  YENİ KOŞU', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#f2e8d4',
      backgroundColor: '#5b3d32', padding: { x: 25, y: 16 }
    }).setInteractive({ useHandCursor: true });
    play.on('pointerover', () => play.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
    play.on('pointerout', () => play.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
    play.on('pointerup', () => this.startNewRun());

    this.add.text(84, h - 82, 'WASD / OKLAR: HAREKET     SPACE: DASH     E: RUH DARBESİ     ESC: DURAKLAT', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#77727a'
    });
    this.add.text(w - 76, h - 48, 'ERKEN OYNANABİLİR TEMEL  •  GEÇİCİ GÖRSELLER', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#625d66'
    }).setOrigin(1, 0.5);

    this.add.text(84, h - 125, 'ENTER / A: YENİ KOŞU', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#a9977d'
    });
    this.input.keyboard?.on('keydown-ENTER', () => this.startNewRun());
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    const confirm = Boolean(pad?.A || pad?.buttons[9]?.pressed);
    if (confirm && !this.previousPadConfirm) this.startNewRun();
    this.previousPadConfirm = confirm;
  }

  private startNewRun(): void {
    this.scene.start('character-select');
  }
}
