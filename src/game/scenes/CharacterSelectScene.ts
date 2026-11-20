import Phaser from 'phaser';
import { CHARACTERS } from '../../data/characters.js';
import { resolveRemoteAction } from '../input/platform-input.js';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false };

  constructor() { super('character-select'); }

  init(data: { characterId?: string }): void {
    const index = CHARACTERS.findIndex(character => character.id === data?.characterId);
    this.selectedIndex = index >= 0 ? index : 0;
    this.frames = [];
    this.previousPad = { left: false, right: false, confirm: false, back: false };
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b0b10');

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x17131c, 1);
    backdrop.fillCircle(width * 0.5, height * 0.36, 330);
    backdrop.lineStyle(1, 0xb99a61, 0.22);
    backdrop.strokeCircle(width * 0.5, height * 0.36, 290);

    this.add.text(64, 48, 'AVCINI SEÇ', {
      fontFamily: 'Georgia, serif', fontSize: '38px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 98, 'Her avcının kendine özgü bir silahı, yeteneği ve savaş tarzı vardır.', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#a9a0a0'
    });

    const gap = 14;
    const margin = 64;
    const cardWidth = (width - margin * 2 - gap * 4) / 5;
    const cardY = 190;
    const cardHeight = 350;
    const accents = [0xc2a36d, 0x8793a7, 0x75b9b2, 0x8e77b8, 0xc65c70];

    CHARACTERS.forEach((character, index) => {
      const x = margin + index * (cardWidth + gap);
      const frame = this.add.graphics();
      this.frames.push(frame);

      const emblem = this.add.graphics();
      emblem.fillStyle(accents[index] ?? 0xb99a61, 0.16);
      emblem.fillCircle(x + cardWidth / 2, cardY + 72, 42);
      emblem.lineStyle(2, accents[index] ?? 0xb99a61, 0.75);
      emblem.strokeCircle(x + cardWidth / 2, cardY + 72, 34);
      emblem.lineBetween(x + cardWidth / 2 - 13, cardY + 72, x + cardWidth / 2 + 13, cardY + 72);
      emblem.lineBetween(x + cardWidth / 2, cardY + 59, x + cardWidth / 2, cardY + 85);
      this.add.text(x + cardWidth / 2, cardY + 72, character.name.slice(0, 1), {
        fontFamily: 'Georgia, serif', fontSize: '27px', color: '#eee1c8', fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(x + 14, cardY + 132, character.name, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f0e6d6', fontStyle: 'bold',
        wordWrap: { width: cardWidth - 28 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 14, cardY + 178, character.role, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#c7ad7b',
        wordWrap: { width: cardWidth - 28 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 17, cardY + 220, character.description, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#aaa2a0',
        wordWrap: { width: cardWidth - 34 }, lineSpacing: 4, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 18, cardY + 292,
        `CAN  ${character.health}   •   HIZ  ${character.moveSpeed}\nYETENEK  ${character.activeAbility}`, {
          fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#d9c9aa',
          wordWrap: { width: cardWidth - 36 }, align: 'center', lineSpacing: 5
        }).setOrigin(0.5, 0);

      const hitArea = this.add.zone(x + cardWidth / 2, cardY + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        this.selectedIndex = index;
        this.refreshSelection();
      });
    });

    this.makeButton(64, height - 82, '‹  GERİ', () => this.scene.start('main-menu'), false, 150);
    this.makeButton(width - 250, height - 82, 'BÖLGEYE DEVAM ET  ›', () => this.continue(), false, 186);
    this.add.text(width / 2, height - 54, '← / → veya D-PAD: SEÇ     A / ENTER: DEVAM     B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#77727a'
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.continue());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('main-menu'));
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.scene.start('main-menu'));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red') this.scene.start('main-menu');
      else if (action === 'confirm' || action === 'green') this.continue();
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
    if (left && !this.previousPad.left) this.moveSelection(-1);
    if (right && !this.previousPad.right) this.moveSelection(1);
    if (confirm && !this.previousPad.confirm) this.continue();
    if (back && !this.previousPad.back) this.scene.start('main-menu');
    this.previousPad = { left, right, confirm, back };
  }

  private moveSelection(direction: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, CHARACTERS.length);
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const width = this.scale.width;
    const gap = 14;
    const margin = 64;
    const cardWidth = (width - margin * 2 - gap * 4) / 5;
    const cardY = 190;
    const cardHeight = 350;
    this.frames.forEach((frame, index) => {
      const x = margin + index * (cardWidth + gap);
      const selected = index === this.selectedIndex;
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

  private makeButton(x: number, y: number, label: string, action: () => void, disabled: boolean, width: number): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '15px',
      color: disabled ? '#77727a' : '#f2e8d4',
      backgroundColor: disabled ? '#29262a' : '#5b3d32',
      padding: { x: 18, y: 13 }
    }).setInteractive({ useHandCursor: !disabled });
    button.setFixedSize(width, 46);
    if (!disabled) {
      button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
      button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
      button.on('pointerup', action);
    }
  }

  private continue(): void {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    this.scene.start('region-select', { characterId: character.id });
  }
}
