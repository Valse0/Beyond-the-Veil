import Phaser from 'phaser';
import { drawUiBackdrop, drawUiPanel, preloadUiArt } from '../ui/dark-fantasy-theme.js';
import { CHARACTERS } from '../../data/characters.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { UI_ASSET_KEYS } from '../../data/asset-registry.js';
import { resolveRemoteAction } from '../input/platform-input.js';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false, details: false };
  private touchLayout = false;
  private selectedPortrait?: Phaser.GameObjects.Image;
  private selectedHunterSprite?: Phaser.GameObjects.Sprite;
  private selectedName?: Phaser.GameObjects.Text;
  private selectedRole?: Phaser.GameObjects.Text;
  private selectedDescription?: Phaser.GameObjects.Text;
  private weaponText?: Phaser.GameObjects.Text;
  private passiveText?: Phaser.GameObjects.Text;
  private abilityText?: Phaser.GameObjects.Text;
  private statsText?: Phaser.GameObjects.Text;

  constructor() { super('character-select'); }

  preload(): void { preloadUiArt(this); }

  init(data: { characterId?: string }): void {
    const index = CHARACTERS.findIndex(character => character.id === data?.characterId);
    this.selectedIndex = index >= 0 ? index : 0;
    this.frames = [];
    this.touchLayout = false;
    this.previousPad = { left: false, right: false, confirm: false, back: false, details: false };
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.touchLayout = this.sys.game.device.input.touch;
    this.cameras.main.setBackgroundColor('#0b0b10');
    drawUiBackdrop(this, 'selection');

    this.add.text(width / 2, 34, 'AVCI SEÇİMİ', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '42px' : '38px',
      color: '#e9dfcb', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5, 0);
    this.add.text(width / 2, 84, 'Avcını seç. Kaderini belirle.', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '20px' : '16px',
      color: '#c7ad7b', letterSpacing: 1
    }).setOrigin(0.5, 0);

    const accents = [0xc2a36d, 0x8793a7, 0x75b9b2, 0x8e77b8, 0xc65c70];
    const railX = 70;
    const railY = 160;
    const railSize = 74;
    const railGap = 12;
    CHARACTERS.forEach((character, index) => {
      const y = railY + index * (railSize + railGap);
      drawUiPanel(this, railX, y, railSize, railSize, accents[index] ?? 0xc6a56b, -20, 0.88);
      const frame = this.add.graphics().setDepth(-18);
      this.frames.push(frame);
      this.add.image(railX + railSize / 2, y + railSize / 2, UI_ASSET_KEYS.hunterPortraits, index)
        .setDisplaySize(64, 64).setDepth(-16).setName('hunter-portrait-' + character.id);
      this.add.zone(railX + railSize / 2, y + railSize / 2, railSize, railSize)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          this.selectedIndex = index;
          this.refreshSelection();
        });
    });

    const heroX = Math.round(width * 0.47);
    const heroY = Math.round(height * 0.48);
    const accent = accents[this.selectedIndex] ?? 0xc2a36d;
    this.add.circle(heroX, heroY, 154, accent, 0.09).setStrokeStyle(2, accent, 0.52).setDepth(-16);
    this.add.circle(heroX, heroY, 132, 0x080b12, 0.58).setStrokeStyle(1, 0xe0c58e, 0.34).setDepth(-15);
    const pedestal = this.add.graphics().setDepth(-14);
    pedestal.fillStyle(0x0b1018, 0.92);
    pedestal.fillEllipse(heroX, 510, 286, 34);
    pedestal.lineStyle(2, 0xc6a56b, 0.58);
    pedestal.strokeEllipse(heroX, 510, 286, 34);
    this.selectedPortrait = this.add.image(heroX, heroY, UI_ASSET_KEYS.hunterPortraits, this.selectedIndex)
      .setDisplaySize(276, 276).setDepth(-13).setName('selected-hunter-portrait');
    const hunterIdleKey = 'ui-cursed-hunter-idle-south';
    if (!this.anims.exists(hunterIdleKey)) {
      this.anims.create({
        key: hunterIdleKey,
        frames: this.anims.generateFrameNumbers('ui-cursed-hunter-idle', { start: 0, end: 3 }),
        frameRate: 5,
        repeat: -1
      });
    }
    this.selectedHunterSprite = this.add.sprite(heroX, 482, 'ui-cursed-hunter-idle', 0)
      .setOrigin(0.5, 0.88).setScale(4.5).setDepth(-12)
      .setName('selected-cursed-hunter-full-body').setVisible(false);
    this.selectedHunterSprite.play(hunterIdleKey);
    this.selectedName = this.add.text(heroX, 526, '', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '30px' : '25px',
      color: '#f0e6d6', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5, 0);
    this.selectedRole = this.add.text(heroX, 562, '', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '18px' : '14px',
      color: '#c7ad7b', align: 'center'
    }).setOrigin(0.5, 0);
    this.selectedDescription = this.add.text(heroX, 586, '', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '11px',
      color: '#aaa2a0', align: 'center', wordWrap: { width: 390 }, lineSpacing: 3
    }).setOrigin(0.5, 0);

    const panelX = Math.round(width * 0.68);
    const panelY = 166;
    const panelWidth = width - panelX - 64;
    const panelHeight = 420;
    const panelAccent = accents[this.selectedIndex] ?? 0xc2a36d;
    drawUiPanel(this, panelX, panelY, panelWidth, panelHeight, panelAccent, -12, 0.96);
    this.add.text(panelX + 28, panelY + 24, 'AVCI KAYDI', {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#e6d5b8', fontStyle: 'bold', letterSpacing: 1
    });
    this.add.rectangle(panelX + 28, panelY + 58, panelWidth - 56, 1, 0xb99a61, 0.52).setOrigin(0, 0);
    const labelStyle = { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#b99a61', fontStyle: 'bold', letterSpacing: 1 };
    this.add.text(panelX + 28, panelY + 82, 'SİLAH', labelStyle);
    this.weaponText = this.add.text(panelX + 28, panelY + 101, '', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f0e6d6'
    });
    this.add.text(panelX + 28, panelY + 145, 'PASİF UZMANLIK', labelStyle);
    this.passiveText = this.add.text(panelX + 28, panelY + 164, '', {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#e4d7c2'
    });
    this.add.text(panelX + 28, panelY + 208, 'BENZERSİZ YETENEK', labelStyle);
    this.abilityText = this.add.text(panelX + 28, panelY + 228, '', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e4d7c2'
    });
    this.add.rectangle(panelX + 28, panelY + 264, panelWidth - 56, 1, 0xb99a61, 0.34).setOrigin(0, 0);
    this.statsText = this.add.text(panelX + 28, panelY + 282, '', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '13px',
      color: '#d9c9aa', lineSpacing: 8, wordWrap: { width: panelWidth - 56 }
    });
    this.add.text(panelX + 28, panelY + 366, '← / →  AVCILAR ARASINDA GEÇİŞ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#89818a', letterSpacing: 1
    });

    if (this.touchLayout) {
      this.makeTouchArrow(142, 354, '‹', () => this.moveSelection(-1));
      this.makeTouchArrow(width - 142, 354, '›', () => this.moveSelection(1));
    }
    this.makeButton(64, height - 102, '‹  GERİ', () => this.scene.start('main-menu'), false, this.touchLayout ? 190 : 150, this.touchLayout ? 19 : 15, this.touchLayout ? 82 : 46);
    this.makeButton(width / 2 - (this.touchLayout ? 90 : 80), height - (this.touchLayout ? 102 : 88), 'AYRINTILAR', () => this.openDetails(), false, this.touchLayout ? 180 : 160, this.touchLayout ? 16 : 14, this.touchLayout ? 82 : 46);
    this.makeButton(width - (this.touchLayout ? 292 : 250), height - 88, 'AVCIYI SEÇ  ›', () => this.continue(), false, this.touchLayout ? 228 : 186, this.touchLayout ? 18 : 15, this.touchLayout ? 82 : 46);
    this.add.text(width / 2, height - 8, '← / → veya D-PAD: SEÇ     A / ENTER: DEVAM     B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '11px', color: '#77727a'
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.continue());
    this.input.keyboard?.on('keydown-I', () => this.openDetails());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('main-menu'));
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.scene.start('main-menu'));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red') this.scene.start('main-menu');
      else if (action === 'confirm' || action === 'green') this.continue();
      else if (action === 'yellow') this.openDetails();
      else if (action === 'blue') this.moveSelection(1);
    });
    this.refreshSelection();
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;
    const left = pad.left || pad.leftStick.x < -0.55;
    const right = pad.right || pad.leftStick.x > 0.55;
    const confirm = pad.A || Boolean(pad.buttons[9]?.pressed);
    const back = pad.B;
    const details = Boolean(pad.buttons[3]?.pressed);
    if (left && !this.previousPad.left) this.moveSelection(-1);
    if (right && !this.previousPad.right) this.moveSelection(1);
    if (confirm && !this.previousPad.confirm) this.continue();
    if (back && !this.previousPad.back) this.scene.start('main-menu');
    if (details && !this.previousPad.details) this.openDetails();
    this.previousPad = { left, right, confirm, back, details };
  }

  private moveSelection(direction: number): void {
    const nextIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, CHARACTERS.length);
    if (this.touchLayout) {
      this.scene.restart({ characterId: CHARACTERS[nextIndex]!.id });
      return;
    }
    this.selectedIndex = nextIndex;
    this.refreshSelection();
  }

  browserTestSnapshot(): { selectedIndex: number; characterId: string; layoutMode: 'touch' | 'desktop' } {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Browser test bridge is disabled.');
    return { selectedIndex: this.selectedIndex, characterId: CHARACTERS[this.selectedIndex]!.id, layoutMode: this.touchLayout ? 'touch' : 'desktop' };
  }

  private refreshSelection(): void {
    const railX = 70;
    const railY = 160;
    const railSize = 74;
    const railGap = 12;
    const accents = [0xc2a36d, 0x8793a7, 0x75b9b2, 0x8e77b8, 0xc65c70];
    this.frames.forEach((frame, index) => {
      const x = railX;
      const y = railY + index * (railSize + railGap);
      const selected = index === this.selectedIndex;
      frame.clear();
      frame.fillStyle(selected ? 0x30251f : 0x17161b, selected ? 0.98 : 0.68);
      frame.fillRoundedRect(x, y, railSize, railSize, 9);
      frame.lineStyle(selected ? 3 : 1, selected ? 0xe1c17f : 0x51484a, selected ? 1 : 0.68);
      frame.strokeRoundedRect(x, y, railSize, railSize, 9);
      if (selected) {
        frame.lineStyle(2, accents[index] ?? 0xc6a56b, 0.9);
        frame.strokeRoundedRect(x + 5, y + 5, railSize - 10, railSize - 10, 6);
      }
    });

    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    const weapon = WEAPONS.find(item => item.id === character.startingWeaponId);
    const passive = PASSIVES.find(item => item.id === character.startingPassiveId);
    this.selectedPortrait?.setFrame(this.selectedIndex);
    this.selectedPortrait?.setVisible(this.selectedIndex !== 0);
    this.selectedHunterSprite?.setVisible(this.selectedIndex === 0);
    this.selectedName?.setText(character.name);
    this.selectedRole?.setText(character.role.toLocaleUpperCase('tr-TR'));
    this.selectedDescription?.setText(character.description);
    this.weaponText?.setText(weapon?.name ?? 'Bilinmeyen silah');
    this.passiveText?.setText(passive?.name ?? 'Bilinmeyen pasif');
    this.abilityText?.setText(character.activeAbility);
    this.statsText?.setText(
      'CAN  ' + character.health + '     HIZ  ' + character.moveSpeed +
      '\nHASAR  ' + Math.round(character.stats.damageMultiplier * 100) + '%     KRİTİK  ' +
      Math.round(character.stats.criticalChance * 100) + '%'
    );
  }

  private makeTouchArrow(x: number, y: number, label: string, action: () => void): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif', fontSize: '56px', color: '#f2e8d4', backgroundColor: '#5b3d32',
      padding: { x: 18, y: 6 }
    }).setOrigin(0.5).setFixedSize(88, 96).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
    button.on('pointerup', action);
  }

  private makeButton(x: number, y: number, label: string, action: () => void, disabled: boolean, width: number, fontSize = 15, height = 46): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: `${fontSize}px`,
      color: disabled ? '#77727a' : '#f2e8d4',
      backgroundColor: disabled ? '#29262a' : '#5b3d32',
      padding: { x: 18, y: height > 46 ? 28 : 13 }
    }).setInteractive({ useHandCursor: !disabled });
    button.setFixedSize(width, height);
    if (!disabled) {
      button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
      button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
      button.on('pointerup', action);
    }
  }

  private openDetails(): void {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    this.scene.start('character-detail', { characterId: character.id });
  }

  private continue(): void {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    this.scene.start('region-select', { characterId: character.id });
  }
}
