import Phaser from 'phaser';
import type { RegionId } from '../../core/types/content.js';
import { CHARACTERS } from '../../data/characters.js';
import { REGIONS } from '../../data/regions.js';

export class RegionSelectScene extends Phaser.Scene {
  private characterId = CHARACTERS[0]!.id;
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false };
  private readonly unlockedRegionIds = new Set<RegionId>([REGIONS[0]!.id]);

  constructor() { super('region-select'); }

  init(data: { characterId?: string }): void {
    this.characterId = CHARACTERS.some(character => character.id === data?.characterId)
      ? data.characterId!
      : CHARACTERS[0]!.id;
    this.selectedIndex = 0;
    this.frames = [];
    this.previousPad = { left: false, right: false, confirm: false, back: false };
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const character = CHARACTERS.find(item => item.id === this.characterId) ?? CHARACTERS[0]!;
    this.cameras.main.setBackgroundColor('#0b0b10');

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x17131c, 1);
    backdrop.fillCircle(width * 0.5, height * 0.35, 340);
    backdrop.lineStyle(1, 0xb99a61, 0.2);
    backdrop.strokeCircle(width * 0.5, height * 0.35, 300);

    this.add.text(64, 38, 'BÖLGE VE ZORLUK', {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 84, `${character.name} ile hangi mühür diyarına gireceksin?`, {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#b8aaa0'
    });

    const gap = 12;
    const margin = 64;
    const cardWidth = (width - margin * 2 - gap * 4) / 5;
    const cardY = 142;
    const cardHeight = 355;

    REGIONS.forEach((region, index) => {
      const x = margin + index * (cardWidth + gap);
      const frame = this.add.graphics();
      this.frames.push(frame);
      const paletteColor = Number.parseInt((region.palette[1] ?? '#51484a').replace('#', ''), 16);
      this.add.rectangle(x + cardWidth / 2, cardY + 48, cardWidth - 26, 72, paletteColor, 0.85)
        .setStrokeStyle(1, 0xb99a61, 0.38);
      this.add.text(x + cardWidth / 2, cardY + 48, String(index + 1).padStart(2, '0'), {
        fontFamily: 'Georgia, serif', fontSize: '36px', color: '#e8d9bd'
      }).setOrigin(0.5);

      this.add.text(x + 13, cardY + 100, region.name, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f0e6d6',
        wordWrap: { width: cardWidth - 26 }, align: 'center', fontStyle: 'bold'
      }).setOrigin(0.5, 0);
      this.add.text(x + 13, cardY + 144, region.subtitle, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#c7ad7b',
        wordWrap: { width: cardWidth - 26 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 16, cardY + 184, region.atmosphere, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#aaa2a0',
        wordWrap: { width: cardWidth - 32 }, align: 'center', lineSpacing: 3
      }).setOrigin(0.5, 0);
      this.add.text(x + 14, cardY + 258,
        `BOSS  ${region.bossId.replaceAll('-', ' ').toUpperCase()}\n${region.enemyIds.length} DÜŞMAN TÜRÜ\n${region.hazards.length} ÇEVRESEL TEHLİKE`, {
          fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#d8c9ad',
          wordWrap: { width: cardWidth - 28 }, align: 'center', lineSpacing: 5
        }).setOrigin(0.5, 0);

      const unlocked = this.unlockedRegionIds.has(region.id);
      if (!unlocked) {
        this.add.text(x + cardWidth / 2, cardY + cardHeight - 38, 'KİLİTLİ', {
          fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#d18b82',
          fontStyle: 'bold', backgroundColor: '#241b20', padding: { x: 12, y: 6 }
        }).setOrigin(0.5);
      } else {
        this.add.text(x + cardWidth / 2, cardY + cardHeight - 38, 'AÇIK', {
          fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b9c99b',
          fontStyle: 'bold', backgroundColor: '#202b24', padding: { x: 12, y: 6 }
        }).setOrigin(0.5);
      }

      const hitArea = this.add.zone(x + cardWidth / 2, cardY + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerup', () => {
        this.selectedIndex = index;
        this.refreshSelection();
      });
    });

    this.add.text(64, 526, 'ZORLUK', {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#d9c9aa'
    });
    this.add.text(190, 526, 'NORMAL  •  AÇIK', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#b9c99b',
      backgroundColor: '#202b24', padding: { x: 12, y: 8 }
    });
    this.add.text(380, 526, 'HARD  •  NORMAL TAMAMLANINCA AÇILIR', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#9b8584',
      backgroundColor: '#292326', padding: { x: 12, y: 8 }
    });
    this.add.text(770, 526, 'NIGHTMARE  •  HARD TAMAMLANINCA AÇILIR', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#9b8584',
      backgroundColor: '#292326', padding: { x: 12, y: 8 }
    });

    this.makeButton(64, height - 76, '‹  AVCIYA GERİ DÖN', () => {
      this.scene.start('character-select', { characterId: this.characterId });
    }, 190);
    this.makeButton(width - 248, height - 76, 'KOŞUYU BAŞLAT  ›', () => this.startRun(), 184);
    this.add.text(width / 2, height - 48, '← / → veya D-PAD: BÖLGE SEÇ     A / ENTER: BAŞLAT     B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#77727a'
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('character-select', { characterId: this.characterId }));
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.scene.start('character-select', { characterId: this.characterId }));
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
    if (confirm && !this.previousPad.confirm) this.startRun();
    if (back && !this.previousPad.back) this.scene.start('character-select', { characterId: this.characterId });
    this.previousPad = { left, right, confirm, back };
  }

  private moveSelection(direction: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, REGIONS.length);
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const width = this.scale.width;
    const gap = 12;
    const margin = 64;
    const cardWidth = (width - margin * 2 - gap * 4) / 5;
    const cardY = 142;
    const cardHeight = 355;
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

  private makeButton(x: number, y: number, label: string, action: () => void, width: number): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f2e8d4',
      backgroundColor: '#5b3d32', padding: { x: 17, y: 12 }
    }).setInteractive({ useHandCursor: true });
    button.setFixedSize(width, 44);
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
    button.on('pointerup', action);
  }

  private startRun(): void {
    const region = REGIONS[this.selectedIndex];
    if (!region || !this.unlockedRegionIds.has(region.id)) return;
    this.scene.start('run', { characterId: this.characterId, regionId: region.id });
  }
}
