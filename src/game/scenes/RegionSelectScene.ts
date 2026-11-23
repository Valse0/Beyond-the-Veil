import Phaser from 'phaser';
import { drawUiBackdrop, drawUiPanel, preloadUiArt } from '../ui/dark-fantasy-theme.js';
import type { RegionId } from '../../core/types/content.js';
import type { ChallengeId, GameMode } from '../../core/types/game.js';
import { CHALLENGES } from '../../data/challenges.js';
import { CHARACTERS } from '../../data/characters.js';
import { REGIONS } from '../../data/regions.js';
import { UI_ASSET_KEYS } from '../../data/asset-registry.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

export class RegionSelectScene extends Phaser.Scene {
  private characterId = CHARACTERS[0]!.id;
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false, mode: false, challenge: false };
  private unlockedRegionIds = new Set<RegionId>([REGIONS[0]!.id]);
  private gameMode: GameMode = 'survival';
  private modeButtons: Phaser.GameObjects.Text[] = [];
  private challengeId: ChallengeId = 'limited-arsenal';
  private challengeButtons: Phaser.GameObjects.Text[] = [];
  private modeHelp?: Phaser.GameObjects.Text;
  private challengeLabel?: Phaser.GameObjects.Text;
  private touchLayout = false;

  constructor() { super('region-select'); }

  preload(): void { preloadUiArt(this); }

  init(data: { characterId?: string; regionId?: string; gameMode?: unknown; challengeId?: unknown }): void {
    this.characterId = CHARACTERS.some(character => character.id === data?.characterId)
      ? data.characterId!
      : CHARACTERS[0]!.id;
    const regionIndex = REGIONS.findIndex(region => region.id === data?.regionId);
    this.selectedIndex = regionIndex >= 0 ? regionIndex : 0;
    this.unlockedRegionIds = new Set([REGIONS[0]!.id]);
    this.frames = [];
    this.previousPad = { left: false, right: false, confirm: false, back: false, mode: false, challenge: false };
    const requestedMode = data?.gameMode;
    this.gameMode = requestedMode === 'boss-hunt' || requestedMode === 'challenge' || requestedMode === 'endless' ? requestedMode : 'survival';
    this.modeButtons = [];
    this.challengeId = CHALLENGES.some(challenge => challenge.id === data?.challengeId)
      ? data.challengeId as ChallengeId
      : 'limited-arsenal';
    this.challengeButtons = [];
    this.modeHelp = undefined;
    this.challengeLabel = undefined;
    this.touchLayout = false;
  }

  create(): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (saveManager) {
      const loaded = saveManager.load();
      if ('data' in loaded) this.unlockedRegionIds = new Set(loaded.data.progression.unlockedRegionIds as RegionId[]);
    }
    const width = this.scale.width;
    const height = this.scale.height;
    this.touchLayout = this.sys.game.device.input.touch;
    const character = CHARACTERS.find(item => item.id === this.characterId) ?? CHARACTERS[0]!;
    this.cameras.main.setBackgroundColor('#0b0b10');

    drawUiBackdrop(this, 'selection');

    const selectedHunterIndex = Math.max(0, CHARACTERS.findIndex(item => item.id === this.characterId));
    drawUiPanel(this, 52, 24, 250, 74, 0x9a8058, -10, 0.9);
    this.add.image(92, 61, UI_ASSET_KEYS.hunterPortraits, selectedHunterIndex).setDisplaySize(58, 58).setDepth(-8);
    this.add.text(132, 42, 'SEÇİLEN AVCI', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#b99a61', fontStyle: 'bold', letterSpacing: 1
    });
    this.add.text(132, 59, character.name, {
      fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f0e6d6', fontStyle: 'bold'
    });
    this.add.text(width / 2, 30, 'BÖLGE & ZORLUK SEÇİMİ', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#e9dfcb', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.add.text(width / 2, 78, 'Keşif yapacağın bölgeyi ve koşu biçimini seç.', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#c7ad7b'
    }).setOrigin(0.5, 0);

    const gap = 12;
    const margin = this.touchLayout ? 230 : 64;
    const cardWidth = this.touchLayout ? 820 : (width - margin * 2 - gap * 4) / 5;
    const cardY = this.touchLayout ? 112 : 142;
    const cardHeight = this.touchLayout ? 320 : 355;

    REGIONS.forEach((region, index) => {
      if (this.touchLayout && index !== this.selectedIndex) return;
      const x = this.touchLayout ? (width - cardWidth) / 2 : margin + index * (cardWidth + gap);
      drawUiPanel(this, x, cardY, cardWidth, cardHeight, Number.parseInt((region.palette[1] ?? '#b99a61').replace('#', ''), 16), -20, 0.88);
      const frame = this.add.graphics().setDepth(-18)
      this.frames.push(frame);
      const paletteColor = Number.parseInt((region.palette[1] ?? '#51484a').replace('#', ''), 16);
      const artHeight = this.touchLayout ? 126 : 148;
      const artY = cardY + (this.touchLayout ? 68 : 82);
      this.add.image(x + cardWidth / 2, artY, UI_ASSET_KEYS.regionArt, index).setDisplaySize(cardWidth - 22, artHeight).setDepth(-16);
      this.add.rectangle(x + cardWidth / 2, artY, cardWidth - 22, artHeight, paletteColor, 0.08).setStrokeStyle(1, 0xb99a61, 0.52).setDepth(-15);
      this.add.text(x + 23, cardY + 18, String(index + 1).padStart(2, '0'), {
        fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '20px' : '17px', color: '#f1e4c9',
        backgroundColor: '#0a0d12', padding: { x: 7, y: 4 }
      }).setOrigin(0, 0);

      this.add.text(x + 13, cardY + (this.touchLayout ? 136 : 164), region.name, {
        fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '28px' : '17px', color: '#f0e6d6',
        wordWrap: { width: cardWidth - 26 }, align: 'center', fontStyle: 'bold'
      }).setOrigin(0.5, 0);
      this.add.text(x + 13, cardY + (this.touchLayout ? 172 : 202), region.subtitle, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '18px' : '11px', color: '#c7ad7b',
        wordWrap: { width: cardWidth - 26 }, align: 'center'
      }).setOrigin(0.5, 0);
      this.add.text(x + 28, cardY + (this.touchLayout ? 202 : 228), region.atmosphere, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '11px', color: '#aaa2a0',
        wordWrap: { width: cardWidth - 32 }, align: 'center', lineSpacing: 3
      }).setOrigin(0.5, 0);
      this.add.text(x + 14, cardY + (this.touchLayout ? 244 : 266),
        `BOSS  ${region.bossId.replaceAll('-', ' ').toUpperCase()}\n${region.enemyIds.length} DÜŞMAN TÜRÜ\n${region.hazards.length} ÇEVRESEL TEHLİKE`, {
          fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '10px', color: '#d8c9ad',
          wordWrap: { width: cardWidth - 28 }, align: 'center', lineSpacing: 5
        }).setOrigin(0.5, 0);

      const unlocked = this.unlockedRegionIds.has(region.id);
      if (!unlocked) {
        this.add.text(x + cardWidth / 2, cardY + cardHeight - (this.touchLayout ? 18 : 26), 'KİLİTLİ', {
          fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '12px', color: '#d18b82',
          fontStyle: 'bold', backgroundColor: '#241b20', padding: { x: 12, y: 6 }
        }).setOrigin(0.5);
      } else {
        this.add.text(x + cardWidth / 2, cardY + cardHeight - (this.touchLayout ? 20 : 38), 'AÇIK', {
          fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '12px', color: '#b9c99b',
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

    if (this.touchLayout) {
      this.add.text(width / 2, 442, 'ZORLUK   NORMAL AÇIK   •   HARD: NORMAL TAMAMLANINCA   •   NIGHTMARE: HARD TAMAMLANINCA', {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#b9c99b', align: 'center', wordWrap: { width: 1120 }
      }).setOrigin(0.5);
    } else {
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
    }

    this.add.text(width / 2, this.touchLayout ? 474 : 558, 'OYUN MODU', {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#d9c9aa'
    }).setOrigin(0.5);
    const modeY = this.touchLayout ? 502 : 588;
    const modeOffset = this.touchLayout ? 390 : 288;
    this.makeModeButton(width / 2 - modeOffset, modeY, 'SURVIVAL', 'survival');
    this.makeModeButton(width / 2 - (this.touchLayout ? 130 : 96), modeY, 'BOSS HUNT', 'boss-hunt');
    this.makeModeButton(width / 2 + (this.touchLayout ? 130 : 96), modeY, 'MEYDAN OKUMA', 'challenge');
    this.makeModeButton(width / 2 + modeOffset, modeY, 'SONSUZ', 'endless');
    this.modeHelp = this.add.text(width / 2, this.touchLayout ? 540 : 616, 'Survival: standart koşu  •  M: mod değiştir', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#89818a'
    }).setOrigin(0.5);
    this.challengeLabel = this.add.text(width / 2, this.touchLayout ? 522 : 616, 'MEYDAN OKUMA SEÇ  •  C / LB / RB: SONRAKİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#c7ad7b'
    }).setOrigin(0.5).setVisible(false);
    CHALLENGES.forEach((challenge, index) => this.makeChallengeButton(width / 2 - 190 + index * 190, this.touchLayout ? 574 : 640, challenge.id, challenge.name));
    this.refreshModeSelection();

    if (this.touchLayout) {
      this.makeTouchArrow(142, 255, '‹', () => this.moveSelection(-1));
      this.makeTouchArrow(width - 142, 255, '›', () => this.moveSelection(1));
    }
    this.makeButton(64, height - 102, '‹  AVCIYA GERİ DÖN', () => {
      this.scene.start('character-select', { characterId: this.characterId });
    }, this.touchLayout ? 230 : 190, this.touchLayout ? 18 : 14, this.touchLayout ? 82 : 44);
    this.makeButton(width - (this.touchLayout ? 292 : 248), height - 88, 'KOŞUYU BAŞLAT  ›', () => this.startRun(), this.touchLayout ? 228 : 184, this.touchLayout ? 18 : 14, this.touchLayout ? 82 : 44);
    this.add.text(width / 2, height - 8, '← / → veya D-PAD: BÖLGE SEÇ     A / ENTER: BAŞLAT     B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '10px', color: '#77727a'
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.on('keydown-M', () => this.toggleGameMode());
    this.input.keyboard?.on('keydown-C', () => this.cycleChallenge());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('character-select', { characterId: this.characterId }));
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.scene.start('character-select', { characterId: this.characterId }));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red') this.scene.start('character-select', { characterId: this.characterId });
      else if (action === 'confirm' || action === 'green') this.startRun();
      else if (action === 'yellow') this.toggleGameMode();
      else if (action === 'blue') this.cycleChallenge();
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
    const mode = Boolean(pad.buttons[3]?.pressed);
    const challenge = Boolean(pad.buttons[4]?.pressed || pad.buttons[5]?.pressed);
    if (left && !this.previousPad.left) this.moveSelection(-1);
    if (right && !this.previousPad.right) this.moveSelection(1);
    if (confirm && !this.previousPad.confirm) this.startRun();
    if (back && !this.previousPad.back) this.scene.start('character-select', { characterId: this.characterId });
    if (mode && !this.previousPad.mode) this.toggleGameMode();
    if (challenge && !this.previousPad.challenge) this.cycleChallenge();
    this.previousPad = { left, right, confirm, back, mode, challenge };
  }

  private toggleGameMode(): void {
    const modes: GameMode[] = ['survival', 'boss-hunt', 'challenge', 'endless'];
    const current = modes.indexOf(this.gameMode);
    this.gameMode = modes[(current + 1) % modes.length]!;
    this.refreshModeSelection();
  }

  private cycleChallenge(): void {
    const current = CHALLENGES.findIndex(challenge => challenge.id === this.challengeId);
    this.challengeId = CHALLENGES[(current + 1) % CHALLENGES.length]!.id;
    this.refreshChallengeSelection();
  }

  private makeChallengeButton(x: number, y: number, challengeId: ChallengeId, label: string): void {
    const button = this.add.text(x, y, label.toLocaleUpperCase('tr-TR'), {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#aaa2a0',
      backgroundColor: '#242127', padding: { x: 8, y: 8 }, align: 'center'
    }).setOrigin(0.5).setFixedSize(176, 34).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => {
      this.challengeId = challengeId;
      this.refreshChallengeSelection();
    });
    this.challengeButtons.push(button);
    this.refreshChallengeSelection();
  }

  private makeModeButton(x: number, y: number, label: string, mode: GameMode): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#aaa2a0',
      backgroundColor: '#242127', padding: { x: 20, y: 10 }, align: 'center'
    }).setOrigin(0.5).setFixedSize(190, 38).setInteractive({ useHandCursor: true });
    button.on('pointerup', () => {
      this.gameMode = mode;
      this.refreshModeSelection();
    });
    this.modeButtons.push(button);
    this.refreshModeSelection();
  }

  private refreshModeSelection(): void {
    this.modeButtons.forEach((button, index) => {
      const modes: GameMode[] = ['survival', 'boss-hunt', 'challenge', 'endless'];
      const selected = modes[index] === this.gameMode;
      button.setStyle({
        color: selected ? '#f2d39a' : '#aaa2a0',
        backgroundColor: selected ? '#5b3d32' : '#242127'
      });
      button.setStroke('#9b8059', selected ? 2 : 1);
    });
    const descriptions:Record<GameMode,string>={survival:'Survival: standart 15 dakikalık koşu  •  M: mod değiştir','boss-hunt':'Boss Hunt: doğrudan bölge boss’u  •  M: mod değiştir',challenge:'',endless:'Sonsuz: bitmeyen dalgalar, boss döngüleri ve değişen lanetler  •  M: mod değiştir'};
    this.modeHelp?.setText(descriptions[this.gameMode]).setVisible(this.gameMode !== 'challenge');
    this.challengeLabel?.setVisible(this.gameMode === 'challenge');
    this.challengeButtons.forEach(button => button.setVisible(this.gameMode === 'challenge'));
  }

  private refreshChallengeSelection(): void {
    this.challengeButtons.forEach((button, index) => {
      const selected = CHALLENGES[index]?.id === this.challengeId;
      button.setStyle({ color: selected ? '#f2d39a' : '#aaa2a0', backgroundColor: selected ? '#5b3d32' : '#242127' });
      button.setStroke('#9b8059', selected ? 2 : 1);
    });
  }

  private moveSelection(direction: number): void {
    const nextIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, REGIONS.length);
    if (this.touchLayout) {
      const region = REGIONS[nextIndex]!;
      this.scene.restart({ characterId: this.characterId, regionId: region.id, gameMode: this.gameMode, challengeId: this.challengeId });
      return;
    }
    this.selectedIndex = nextIndex;
    this.refreshSelection();
  }

  browserTestSnapshot(): { selectedIndex: number; regionId: string; gameMode: GameMode; challengeId: ChallengeId; layoutMode: 'touch' | 'desktop' } {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Browser test bridge is disabled.');
    return { selectedIndex: this.selectedIndex, regionId: REGIONS[this.selectedIndex]!.id, gameMode: this.gameMode, challengeId: this.challengeId, layoutMode: this.touchLayout ? 'touch' : 'desktop' };
  }

  private refreshSelection(): void {
    const width = this.scale.width;
    const gap = 12;
    const margin = this.touchLayout ? 230 : 64;
    const cardWidth = this.touchLayout ? 820 : (width - margin * 2 - gap * 4) / 5;
    const cardY = this.touchLayout ? 112 : 142;
    const cardHeight = this.touchLayout ? 320 : 355;
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

  private makeButton(x: number, y: number, label: string, action: () => void, width: number, fontSize = 14, height = 44): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: `${fontSize}px`, color: '#f2e8d4',
      backgroundColor: '#5b3d32', padding: { x: 17, y: height > 44 ? 28 : 12 }
    }).setInteractive({ useHandCursor: true });
    button.setFixedSize(width, height);
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
    button.on('pointerup', action);
  }

  private startRun(): void {
    const region = REGIONS[this.selectedIndex];
    if (!region || !this.unlockedRegionIds.has(region.id)) return;
    this.scene.start('run-preparation', { characterId: this.characterId, regionId: region.id, gameMode: this.gameMode, challengeId: this.gameMode === 'challenge' ? this.challengeId : undefined });
  }
}
