import Phaser from 'phaser';
import { drawUiBackdrop, drawUiPanel, preloadUiArt } from '../ui/dark-fantasy-theme.js';
import { CHARACTERS } from '../../data/characters.js';
import { resolveRemoteAction } from '../input/platform-input.js';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false, details: false };
  private touchLayout = false;

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

    this.add.text(64, 48, 'AVCINI SEÇ', {
      fontFamily: 'Georgia, serif', fontSize: '38px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 98, 'Her avcının kendine özgü bir silahı, yeteneği ve savaş tarzı vardır.', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#a9a0a0'
    });

    const gap = 14;
    const margin = this.touchLayout ? 230 : 64;
    const cardWidth = this.touchLayout ? 820 : (width - margin * 2 - gap * 4) / 5;
    const cardY = this.touchLayout ? 142 : 190;
    const cardHeight = this.touchLayout ? 430 : 350;
    const accents = [0xc2a36d, 0x8793a7, 0x75b9b2, 0x8e77b8, 0xc65c70];

    CHARACTERS.forEach((character, index) => {
      if (this.touchLayout && index !== this.selectedIndex) return;
      const x = this.touchLayout ? (width - cardWidth) / 2 : margin + index * (cardWidth + gap);
      drawUiPanel(this, x, cardY, cardWidth, cardHeight, accents[index] ?? 0xc6a56b, -20, 0.88);
      const frame = this.add.graphics().setDepth(-18)
      this.frames.push(frame);

      const portraitHalo = this.add.circle(x + cardWidth / 2, cardY + 76, 62, accents[index] ?? 0xb99a61, 0.13)
        .setStrokeStyle(2, accents[index] ?? 0xb99a61, 0.72).setDepth(-16);
      this.add.image(x + cardWidth / 2, cardY + 76, 'hunter-portraits', index)
        .setDisplaySize(116, 116).setDepth(-15).setName('hunter-portrait-' + character.id);

      this.add.text(x + 14, cardY + (this.touchLayout ? 154 : 150), character.name, {
        fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '30px' : '18px', color: '#f0e6d6', fontStyle: 'bold',
        wordWrap: { width: cardWidth - 28 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 14, cardY + (this.touchLayout ? 202 : 194), character.role, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '19px' : '12px', color: '#c7ad7b',
        wordWrap: { width: cardWidth - 28 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 36, cardY + (this.touchLayout ? 248 : 232), character.description, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '19px' : '12px', color: '#aaa2a0',
        wordWrap: { width: cardWidth - 72 }, lineSpacing: this.touchLayout ? 8 : 4, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 18, cardY + (this.touchLayout ? 360 : 302),
        `CAN  ${character.health}   •   HIZ  ${character.moveSpeed}\nYETENEK  ${character.activeAbility}`, {
          fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '11px', color: '#d9c9aa',
          wordWrap: { width: cardWidth - 36 }, align: 'center', lineSpacing: 5
        }).setOrigin(0.5, 0);

      const hitArea = this.add.zone(x + cardWidth / 2, cardY + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        this.selectedIndex = index;
        this.refreshSelection();
      });
    });

    if (this.touchLayout) {
      this.makeTouchArrow(142, 354, '‹', () => this.moveSelection(-1));
      this.makeTouchArrow(width - 142, 354, '›', () => this.moveSelection(1));
    }
    this.makeButton(64, height - 102, this.touchLayout ? '‹  GERİ' : '‹  GERİ', () => this.scene.start('main-menu'), false, this.touchLayout ? 190 : 150, this.touchLayout ? 19 : 15, this.touchLayout ? 82 : 46);
    this.makeButton(width / 2 - (this.touchLayout ? 90 : 80), height - (this.touchLayout ? 102 : 88), 'AYRINTILAR', () => this.openDetails(), false, this.touchLayout ? 180 : 160, this.touchLayout ? 16 : 14, this.touchLayout ? 82 : 46);
    this.makeButton(width - (this.touchLayout ? 292 : 250), height - 88, 'BÖLGEYE DEVAM ET  ›', () => this.continue(), false, this.touchLayout ? 228 : 186, this.touchLayout ? 18 : 15, this.touchLayout ? 82 : 46);
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
    const width = this.scale.width;
    const gap = 14;
    const margin = this.touchLayout ? 230 : 64;
    const cardWidth = this.touchLayout ? 820 : (width - margin * 2 - gap * 4) / 5;
    const cardY = this.touchLayout ? 142 : 190;
    const cardHeight = this.touchLayout ? 430 : 350;
    this.frames.forEach((frame, index) => {
      const x = this.touchLayout ? (width - cardWidth) / 2 : margin + index * (cardWidth + gap);
      const selected = this.touchLayout || index === this.selectedIndex;
      frame.clear();
      frame.fillStyle(selected ? 0x30251f : 0x17161b, selected ? 0.98 : 0.88);
      frame.fillRoundedRect(x, cardY, cardWidth, cardHeight, 12);
      frame.lineStyle(selected ? 3 : 1, selected ? 0xd4b777 : 0x51484a, selected ? 1 : 0.7);
      frame.strokeRoundedRect(x, cardY, cardWidth, cardHeight, 12);
      if (selected) {
        frame.fillStyle(0xd4b777, 1);
        frame.fillRoundedRect(x + 18, cardY + cardHeight - 9, cardWidth - 36, 3, 2);
      }
    });
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
