import Phaser from 'phaser';

type MainMenuItem = 'new-run' | 'hunter-hub';

export class MainMenuScene extends Phaser.Scene {
  private selectedItem: MainMenuItem = 'new-run';
  private previousPadConfirm = false;
  private previousPadNavigation = '';
  private playButton?: Phaser.GameObjects.Text;
  private hubButton?: Phaser.GameObjects.Text;

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

    this.playButton = this.add.text(82, h - 185, '▶  YENİ KOŞU', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#f2e8d4',
      backgroundColor: '#5b3d32', padding: { x: 25, y: 16 }
    }).setInteractive({ useHandCursor: true });
    this.playButton.on('pointerover', () => this.setSelectedItem('new-run'));
    this.playButton.on('pointerup', () => this.startNewRun());

    this.hubButton = this.add.text(320, h - 185, '⚒  AVCI KARARGAHI', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#f2e8d4',
      backgroundColor: '#2b2528', padding: { x: 25, y: 16 }
    }).setInteractive({ useHandCursor: true });
    this.hubButton.on('pointerover', () => this.setSelectedItem('hunter-hub'));
    this.hubButton.on('pointerup', () => this.openHunterHub());

    this.setSelectedItem(this.selectedItem);

    this.add.text(84, h - 82, 'WASD / OKLAR: HAREKET     SPACE: DASH     E: RUH DARBESİ     ESC: DURAKLAT', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#77727a'
    });
    this.add.text(w - 76, h - 48, 'ERKEN OYNANABİLİR TEMEL  •  GEÇİCİ GÖRSELLER', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#625d66'
    }).setOrigin(1, 0.5);

    this.add.text(84, h - 125, 'OKLAR: SEÇ     ENTER / SPACE / A: ONAYLA', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#a9977d'
    });

    this.input.keyboard?.on('keydown-LEFT', (event: KeyboardEvent) => {
      if (!event.repeat) this.setSelectedItem('new-run');
    });
    this.input.keyboard?.on('keydown-UP', (event: KeyboardEvent) => {
      if (!event.repeat) this.setSelectedItem('new-run');
    });
    this.input.keyboard?.on('keydown-RIGHT', (event: KeyboardEvent) => {
      if (!event.repeat) this.setSelectedItem('hunter-hub');
    });
    this.input.keyboard?.on('keydown-DOWN', (event: KeyboardEvent) => {
      if (!event.repeat) this.setSelectedItem('hunter-hub');
    });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (!event.repeat) this.activateSelectedItem();
    });
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!event.repeat) this.activateSelectedItem();
    });
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) {
      this.previousPadConfirm = false;
      this.previousPadNavigation = '';
      return;
    }

    const confirm = Boolean(pad.A || pad.buttons[9]?.pressed);
    if (confirm && !this.previousPadConfirm) this.activateSelectedItem();
    this.previousPadConfirm = confirm;

    const dpadUp = Boolean(pad.buttons[12]?.pressed);
    const dpadDown = Boolean(pad.buttons[13]?.pressed);
    const dpadLeft = Boolean(pad.buttons[14]?.pressed);
    const dpadRight = Boolean(pad.buttons[15]?.pressed);
    const stickX = pad.leftStick.x;
    const stickY = pad.leftStick.y;
    const direction = dpadLeft || (!dpadUp && !dpadDown && !dpadRight && stickX < -0.5)
      ? 'left'
      : dpadRight || (!dpadUp && !dpadDown && stickX > 0.5)
        ? 'right'
        : dpadUp || stickY < -0.5
          ? 'up'
          : dpadDown || stickY > 0.5
            ? 'down'
            : '';

    if (direction && direction !== this.previousPadNavigation) {
      this.setSelectedItem(direction === 'left' || direction === 'up' ? 'new-run' : 'hunter-hub');
    }
    this.previousPadNavigation = direction;
  }

  private setSelectedItem(item: MainMenuItem): void {
    this.selectedItem = item;
    this.playButton?.setStyle({
      backgroundColor: item === 'new-run' ? '#79513c' : '#2b2528',
      color: item === 'new-run' ? '#ffffff' : '#bcb2a7',
      fontStyle: item === 'new-run' ? 'bold' : 'normal'
    });
    this.hubButton?.setStyle({
      backgroundColor: item === 'hunter-hub' ? '#79513c' : '#2b2528',
      color: item === 'hunter-hub' ? '#ffffff' : '#bcb2a7',
      fontStyle: item === 'hunter-hub' ? 'bold' : 'normal'
    });
  }

  private activateSelectedItem(): void {
    if (this.selectedItem === 'new-run') this.startNewRun();
    else this.openHunterHub();
  }

  private startNewRun(): void {
    this.scene.start('character-select');
  }

  private openHunterHub(): void {
    this.scene.start('hunter-hub');
  }
}
