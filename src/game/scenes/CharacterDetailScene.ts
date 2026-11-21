import Phaser from 'phaser';
import { CHARACTERS } from '../../data/characters.js';
import { PASSIVES } from '../../data/passives.js';
import { WEAPONS } from '../../data/weapons.js';
import { CHARACTER_MASTERY_THRESHOLDS, getCharacterMasteryLevel } from '../../gameplay/progression/character-mastery.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

const ELEMENT_NAMES: Record<string, string> = {
  fire: 'Ateş', ice: 'Buz', poison: 'Zehir', dark: 'Karanlık',
  spirit: 'Ruh', lightning: 'Yıldırım', blood: 'Kan'
};

type MasteryRewardSnapshot = { level: number; rewardId: string; description: string; unlocked: boolean };
type CosmeticSnapshot = { id: string; unlocked: boolean };

export class CharacterDetailScene extends Phaser.Scene {
  private selectedIndex = 0;
  private previousPad = { left: false, right: false, confirm: false, back: false, next: false, previous: false };
  private touchLayout = false;
  private activeTouchSection = 0;

  constructor() { super('character-detail'); }

  init(data: { characterId?: string }): void {
    const index = CHARACTERS.findIndex(character => character.id === data?.characterId);
    this.selectedIndex = index >= 0 ? index : 0;
    this.touchLayout = false;
    this.activeTouchSection = 0;
    this.previousPad = { left: false, right: false, confirm: false, back: false, next: false, previous: false };
  }

  create(): void {
    this.touchLayout = this.sys.game.device.input.touch;
    this.render();
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.returnToSelection());
    this.input.keyboard?.on('keydown-SPACE', () => this.returnToSelection());
    this.input.keyboard?.on('keydown-ESC', () => this.returnToSelection());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.returnToSelection());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red' || action === 'confirm' || action === 'green') this.returnToSelection();
      else if (action === 'yellow') this.moveSelection(1);
      else if (action === 'blue') this.moveSelection(-1);
    });
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) {
      this.previousPad = { left: false, right: false, confirm: false, back: false, next: false, previous: false };
      return;
    }
    const left = pad.left || pad.leftStick.x < -0.55;
    const right = pad.right || pad.leftStick.x > 0.55;
    const confirm = pad.A || Boolean(pad.buttons[9]?.pressed);
    const back = pad.B;
    const next = Boolean(pad.buttons[5]?.pressed);
    const previous = Boolean(pad.buttons[4]?.pressed);
    if (left && !this.previousPad.left) this.moveSelection(-1);
    if (right && !this.previousPad.right) this.moveSelection(1);
    if (confirm && !this.previousPad.confirm) this.returnToSelection();
    if (back && !this.previousPad.back) this.returnToSelection();
    if (next && !this.previousPad.next) this.moveSelection(1);
    if (previous && !this.previousPad.previous) this.moveSelection(-1);
    this.previousPad = { left, right, confirm, back, next, previous };
  }

  browserTestSnapshot(): {
    characterId: string;
    name: string;
    unlocked: boolean;
    startingWeaponId: string;
    startingWeaponName: string;
    startingPassiveId: string;
    startingPassiveName: string;
    activeAbility: string;
    health: number;
    moveSpeed: number;
    damageMultiplier: number;
    criticalChance: number;
    armor: number;
    weaponSynergies: { id: string; name: string }[];
    elementSynergies: { id: string; name: string }[];
    masteryPoints: number;
    masteryLevel: number;
    nextMilestonePoints: number | null;
    masteryRewards: MasteryRewardSnapshot[];
    cosmetics: CosmeticSnapshot[];
    layoutMode: 'touch-sections' | 'desktop-columns';
    activeSection: number;
    presentationFontSize: number;
  } {
    this.assertBrowserTestMode();
    return { ...this.buildSnapshot(), layoutMode: this.touchLayout ? 'touch-sections' : 'desktop-columns', activeSection: this.activeTouchSection, presentationFontSize: this.touchLayout ? 22 : 14 };
  }

  private buildSnapshot() {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    const loaded = (this.registry.get('saveManager') as SaveManager | undefined)?.load();
    const data = loaded && 'data' in loaded ? loaded.data : null;
    const unlockedMasteryRewardIds = new Set(data?.collections.unlockedMasteryRewardIds ?? []);
    const unlockedCosmeticIds = new Set(data?.collections.unlockedCosmeticIds ?? []);
    const masteryPoints = data?.collections.characterMastery[character.id] ?? 0;
    const masteryLevel = getCharacterMasteryLevel(masteryPoints);
    const nextMilestone = CHARACTER_MASTERY_THRESHOLDS.find(item => item.level > masteryLevel);
    const cosmetics: CosmeticSnapshot[] = character.cosmetics.map((id, index) => ({
      id,
      unlocked: index === 0 || unlockedCosmeticIds.has(id)
    }));
    const masteryCosmeticReward = character.mastery.find(reward => reward.level === 10);
    if (masteryCosmeticReward && unlockedCosmeticIds.has(masteryCosmeticReward.rewardId)
      && !cosmetics.some(cosmetic => cosmetic.id === masteryCosmeticReward.rewardId)) {
      cosmetics.push({ id: masteryCosmeticReward.rewardId, unlocked: true });
    }
    return {
      characterId: character.id,
      name: character.name,
      unlocked: data?.progression.unlockedCharacterIds.includes(character.id) ?? false,
      startingWeaponId: character.startingWeaponId,
      startingWeaponName: WEAPONS.find(item => item.id === character.startingWeaponId)?.name ?? character.startingWeaponId,
      startingPassiveId: character.startingPassiveId,
      startingPassiveName: PASSIVES.find(item => item.id === character.startingPassiveId)?.name ?? character.startingPassiveId,
      activeAbility: character.activeAbility,
      health: character.health,
      moveSpeed: character.moveSpeed,
      damageMultiplier: character.stats.damageMultiplier,
      criticalChance: character.stats.criticalChance,
      armor: character.stats.armor,
      weaponSynergies: character.weaponSynergies.map(id => ({ id, name: WEAPONS.find(item => item.id === id)?.name ?? id })),
      elementSynergies: character.elementSynergies.map(id => ({ id, name: ELEMENT_NAMES[id] ?? id })),
      masteryPoints,
      masteryLevel,
      nextMilestonePoints: nextMilestone?.points ?? null,
      masteryRewards: character.mastery.map(reward => ({
        ...reward,
        unlocked: unlockedMasteryRewardIds.has(reward.rewardId)
      })),
      cosmetics
    };
  }

  private render(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    const snapshot = this.buildSnapshot();
    const touch = this.touchLayout;
    const font = touch ? 12 : 14;
    const small = touch ? 10 : 12;
    const panelY = 142;
    const panelHeight = height - 232;
    const margin = touch ? 54 : 64;
    const gap = touch ? 12 : 18;
    const panelWidth = (width - margin * 2 - gap * 2) / 3;
    const panelXs = [margin, margin + panelWidth + gap, margin + (panelWidth + gap) * 2];

    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#0b0b10');
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x17131c, 1);
    backdrop.fillCircle(width * 0.78, height * 0.32, 300);
    backdrop.lineStyle(1, 0xb99a61, 0.18);
    backdrop.strokeCircle(width * 0.78, height * 0.32, 260);

    this.add.text(64, 34, 'AVCI DOSYASI', {
      fontFamily: 'Georgia, serif', fontSize: touch ? '28px' : '34px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(width - 64, 46, character.unlocked ? 'AÇIK AVCI' : 'KİLİTLİ AVCI', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: character.unlocked ? '#b9c9a2' : '#d18b82'
    }).setOrigin(1, 0);

    if (touch) {
      this.renderTouchSections(snapshot, character, width, height);
      this.makeArrow(44, height / 2, '‹', () => this.moveSelection(-1));
      this.makeArrow(width - 44, height / 2, '›', () => this.moveSelection(1));
      this.makeButton(64, height - 86, '‹  AVCI SEÇİMİNE DÖN', () => this.returnToSelection(), 250, 16, 76);
      this.add.text(width - 64, height - 28, 'ÖNCEKİ / SONRAKİ: AVCI DEĞİŞTİR', {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#aaa09a'
      }).setOrigin(1, 0.5);
      return;
    }

    const panelColors = [0x30251f, 0x211d26, 0x211a23];
    panelXs.forEach((x, index) => {
      this.add.rectangle(x + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, panelColors[index]!, 0.96)
        .setStrokeStyle(1, index === 2 ? 0xb99a61 : 0x6b5b55, 0.7);
    });

    const left = panelXs[0]!;
    this.add.text(left + 22, panelY + 18, character.name, {
      fontFamily: 'Georgia, serif', fontSize: touch ? '20px' : '25px', color: '#f0e6d6', fontStyle: 'bold',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(left + 22, panelY + 58, character.role, {
      fontFamily: 'Arial, sans-serif', fontSize: font + 'px', color: '#c7ad7b',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(left + 22, panelY + 92, character.description, {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#b7ada8',
      wordWrap: { width: panelWidth - 44 }, lineSpacing: 4
    });
    this.add.text(left + 22, panelY + 158, 'SAVAŞ İSTATİSTİKLERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    const stats = [
      'Can: ' + character.health,
      'Hareket hızı: ' + character.moveSpeed,
      'Hasar çarpanı: x' + character.stats.damageMultiplier.toFixed(2),
      'Kritik şansı: %' + Math.round(character.stats.criticalChance * 100),
      'Zırh: ' + character.stats.armor
    ];
    this.add.text(left + 22, panelY + 184, stats.join('\n'), {
      fontFamily: 'Arial, sans-serif', fontSize: font + 'px', color: '#e0d3c1', lineSpacing: 6
    });
    this.add.text(left + 22, panelY + 310, 'HİKÂYESİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(left + 22, panelY + 334, character.story, {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#aaa09a',
      wordWrap: { width: panelWidth - 44 }, lineSpacing: 4
    });

    const middle = panelXs[1]!;
    const weapon = WEAPONS.find(item => item.id === character.startingWeaponId);
    const passive = PASSIVES.find(item => item.id === character.startingPassiveId);
    this.add.text(middle + 22, panelY + 18, 'BAŞLANGIÇ DİZİLİMİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(middle + 22, panelY + 48, 'SİLAH  •  ' + (weapon?.name ?? character.startingWeaponId), {
      fontFamily: 'Georgia, serif', fontSize: font + 'px', color: '#f0e6d6',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 78, weapon?.description ?? 'Başlangıç silahı', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#aaa09a',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 132, 'PASİF  •  ' + (passive?.name ?? character.startingPassiveId), {
      fontFamily: 'Georgia, serif', fontSize: font + 'px', color: '#f0e6d6',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 162, passive?.specialUpgrade.effect ?? passive?.description ?? 'Başlangıç pasifi', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#aaa09a',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 226, 'AKTİF YETENEK', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(middle + 22, panelY + 250, character.activeAbility + '  •  ' + (character.ability.cooldownMs / 1000).toFixed(1) + ' sn bekleme', {
      fontFamily: 'Georgia, serif', fontSize: font + 'px', color: '#f0e6d6',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 304, 'SİLAH SİNERJİLERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(middle + 22, panelY + 328, snapshot.weaponSynergies.map(item => item.name).join('  •  '), {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#e0d3c1',
      wordWrap: { width: panelWidth - 44 }
    });
    this.add.text(middle + 22, panelY + 382, 'ELEMENT UYUMU', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(middle + 22, panelY + 406, snapshot.elementSynergies.map(item => item.name).join('  •  '), {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#e0d3c1',
      wordWrap: { width: panelWidth - 44 }
    });

    const right = panelXs[2]!;
    this.add.text(right + 22, panelY + 18, 'KARAKTER USTALIĞI', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    this.add.text(right + 22, panelY + 48, 'SEVİYE ' + snapshot.masteryLevel + '  •  ' + snapshot.masteryPoints + ' PUAN', {
      fontFamily: 'Georgia, serif', fontSize: font + 1 + 'px', color: '#f0e6d6'
    });
    const nextMilestone = CHARACTER_MASTERY_THRESHOLDS.find(item => item.level > snapshot.masteryLevel);
    const previousThreshold = [...CHARACTER_MASTERY_THRESHOLDS].reverse().find(item => item.level <= snapshot.masteryLevel)?.points ?? 0;
    const progress = nextMilestone
      ? Phaser.Math.Clamp((snapshot.masteryPoints - previousThreshold) / (nextMilestone.points - previousThreshold), 0, 1)
      : 1;
    this.add.rectangle(right + 22 + (panelWidth - 44) / 2, panelY + 91, panelWidth - 44, 10, 0x100e13, 1).setOrigin(0.5);
    this.add.rectangle(right + 22 + ((panelWidth - 44) * progress) / 2, panelY + 91, (panelWidth - 44) * progress, 10, 0xb99a61, 1).setOrigin(0.5);
    this.add.text(right + 22, panelY + 108, nextMilestone
      ? 'Sonraki eşik: Seviye ' + nextMilestone.level + ' / ' + nextMilestone.points + ' puan'
      : 'Azami ustalık seviyesine ulaşıldı.', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#aaa09a'
    });
    this.add.text(right + 22, panelY + 150, 'USTALIK ÖDÜLLERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    snapshot.masteryRewards.forEach((reward, index) => {
      const y = panelY + 178 + index * 38;
      this.add.text(right + 22, y, (reward.unlocked ? '✓ ' : '◇ ') + 'Sv. ' + reward.level + '  ' + reward.description, {
        fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: reward.unlocked ? '#b9c9a2' : '#aaa09a',
        wordWrap: { width: panelWidth - 44 }
      });
    });
    this.add.text(right + 22, panelY + 302, 'KOZMETİKLER', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#c7ad7b', fontStyle: 'bold'
    });
    snapshot.cosmetics.forEach((cosmetic, index) => {
      const y = panelY + 330 + index * 28;
      this.add.text(right + 22, y, (cosmetic.unlocked ? '✓ ' : '🔒 ') + cosmetic.id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '), {
        fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: cosmetic.unlocked ? '#b9c9a2' : '#89818a',
        wordWrap: { width: panelWidth - 44 }
      });
    });

    if (touch) {
      this.makeArrow(44, height / 2, '‹', () => this.moveSelection(-1));
      this.makeArrow(width - 44, height / 2, '›', () => this.moveSelection(1));
    }
    this.makeButton(64, height - 86, '‹  AVCI SEÇİMİNE DÖN', () => this.returnToSelection(), touch ? 250 : 250, touch ? 16 : 14, touch ? 76 : 46);
    this.add.text(width - 64, height - 28, '← / → D-PAD: AVCI DEĞİŞTİR   •   A / ENTER / B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: small + 'px', color: '#77727a'
    }).setOrigin(1, 0.5);
  }

  private renderTouchSections(snapshot: ReturnType<CharacterDetailScene['buildSnapshot']>, character: typeof CHARACTERS[number], width: number, height: number): void {
    const sections = ['KİMLİK & İSTATİSTİKLER', 'SİLAH & YETENEKLER', 'USTALIK & KOZMETİK'];
    const margin = 108;
    const gap = 12;
    const tabY = 104;
    const tabHeight = 60;
    const tabWidth = (width - margin * 2 - gap * 2) / 3;
    sections.forEach((label, index) => {
      const x = margin + index * (tabWidth + gap);
      const selected = this.activeTouchSection === index;
      const tab = this.add.rectangle(x + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight,
        selected ? 0x79513c : 0x302832, 1).setStrokeStyle(2, selected ? 0xd1ad72 : 0x6b5b55, 0.9)
        .setInteractive({ useHandCursor: true });
      this.add.text(x + tabWidth / 2, tabY + tabHeight / 2, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: selected ? '#fff1d8' : '#c7b8a8',
        fontStyle: 'bold', align: 'center', wordWrap: { width: tabWidth - 20 }
      }).setOrigin(0.5);
      tab.on('pointerup', () => {
        this.activeTouchSection = index;
        this.render();
      });
    });

    const panelX = margin;
    const panelY = 184;
    const panelWidth = width - margin * 2;
    const panelHeight = height - 278;
    this.add.rectangle(panelX + panelWidth / 2, panelY + panelHeight / 2, panelWidth, panelHeight, 0x211d26, 0.98)
      .setStrokeStyle(2, 0x8c7054, 0.85);
    const left = panelX + 34;
    const right = panelX + panelWidth - 34;
    const bodyWidth = panelWidth - 68;
    const heading = (x: number, y: number, text: string) => this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#c7ad7b', fontStyle: 'bold'
    });
    const body = (x: number, y: number, text: string, wrapWidth = bodyWidth) => this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#e0d3c1',
      wordWrap: { width: wrapWidth }, lineSpacing: 7
    });
    const title = (x: number, y: number, text: string, wrapWidth = bodyWidth) => this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif', fontSize: '25px', color: '#f0e6d6', fontStyle: 'bold',
      wordWrap: { width: wrapWidth }
    });

    if (this.activeTouchSection === 0) {
      const columnGap = 34;
      const columnWidth = (bodyWidth - columnGap) / 2;
      title(left, panelY + 26, character.name, columnWidth);
      body(left, panelY + 66, character.role, columnWidth).setColor('#c7ad7b');
      heading(left, panelY + 126, 'SAVAŞ İSTATİSTİKLERİ');
      body(left, panelY + 158, [
        'Can: ' + character.health,
        'Hareket hızı: ' + character.moveSpeed,
        'Hasar çarpanı: x' + character.stats.damageMultiplier.toFixed(2),
        'Kritik şansı: %' + Math.round(character.stats.criticalChance * 100),
        'Zırh: ' + character.stats.armor
      ].join('\n'), columnWidth);
      const storyX = left + columnWidth + columnGap;
      heading(storyX, panelY + 26, 'KARAKTERİN HİKÂYESİ');
      body(storyX, panelY + 62, character.description + '\n\n' + character.story, columnWidth)
        .setColor('#c9c0b8');
    } else if (this.activeTouchSection === 1) {
      const weapon = WEAPONS.find(item => item.id === character.startingWeaponId);
      const passive = PASSIVES.find(item => item.id === character.startingPassiveId);
      const columnGap = 34;
      const columnWidth = (bodyWidth - columnGap) / 2;
      heading(left, panelY + 26, 'BAŞLANGIÇ SİLAHI');
      title(left, panelY + 60, weapon?.name ?? character.startingWeaponId, columnWidth);
      body(left, panelY + 102, weapon?.description ?? 'Başlangıç silahı', columnWidth).setColor('#c9c0b8');
      heading(left, panelY + 214, 'PASİF');
      title(left, panelY + 248, passive?.name ?? character.startingPassiveId, columnWidth);
      body(left, panelY + 290, passive?.specialUpgrade.effect ?? passive?.description ?? 'Başlangıç pasifi', columnWidth)
        .setColor('#c9c0b8');
      const rightX = left + columnWidth + columnGap;
      heading(rightX, panelY + 26, 'AKTİF YETENEK');
      title(rightX, panelY + 60, character.activeAbility, columnWidth);
      body(rightX, panelY + 102, 'Bekleme süresi: ' + (character.ability.cooldownMs / 1000).toFixed(1) + ' saniye', columnWidth);
      heading(rightX, panelY + 174, 'SİLAH SİNERJİLERİ');
      body(rightX, panelY + 208, snapshot.weaponSynergies.map(item => item.name).join('  •  '), columnWidth);
      heading(rightX, panelY + 280, 'ELEMENT UYUMU');
      body(rightX, panelY + 314, snapshot.elementSynergies.map(item => item.name).join('  •  '), columnWidth);
    } else {
      heading(left, panelY + 24, 'KARAKTER USTALIĞI');
      title(left, panelY + 56, 'SEVİYE ' + snapshot.masteryLevel + '  •  ' + snapshot.masteryPoints + ' PUAN');
      const nextMilestone = CHARACTER_MASTERY_THRESHOLDS.find(item => item.level > snapshot.masteryLevel);
      const previousThreshold = [...CHARACTER_MASTERY_THRESHOLDS].reverse().find(item => item.level <= snapshot.masteryLevel)?.points ?? 0;
      const progress = nextMilestone
        ? Phaser.Math.Clamp((snapshot.masteryPoints - previousThreshold) / (nextMilestone.points - previousThreshold), 0, 1)
        : 1;
      const barWidth = Math.min(420, bodyWidth * 0.52);
      this.add.rectangle(left + barWidth / 2, panelY + 112, barWidth, 14, 0x100e13, 1).setOrigin(0.5);
      this.add.rectangle(left + (barWidth * progress) / 2, panelY + 112, barWidth * progress, 14, 0xb99a61, 1).setOrigin(0.5);
      body(left, panelY + 134, nextMilestone
        ? 'Sonraki eşik: Seviye ' + nextMilestone.level + ' / ' + nextMilestone.points + ' puan'
        : 'Azami ustalık seviyesine ulaşıldı.', bodyWidth).setColor('#c9c0b8');
      const columnGap = 34;
      const columnWidth = (bodyWidth - columnGap) / 2;
      heading(left, panelY + 196, 'USTALIK ÖDÜLLERİ');
      snapshot.masteryRewards.forEach((reward, index) => {
        const item = body(left, panelY + 230 + index * 48,
          (reward.unlocked ? '✓  ' : '◇  ') + 'Seviye ' + reward.level + '  •  ' + reward.description, columnWidth);
        item.setColor(reward.unlocked ? '#b9c9a2' : '#c9c0b8');
      });
      const cosmeticX = left + columnWidth + columnGap;
      heading(cosmeticX, panelY + 196, 'KOZMETİKLER');
      snapshot.cosmetics.forEach((cosmetic, index) => {
        const label = cosmetic.id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
        const item = body(cosmeticX, panelY + 230 + index * 40,
          (cosmetic.unlocked ? '✓  ' : '🔒  ') + label, columnWidth);
        item.setColor(cosmetic.unlocked ? '#b9c9a2' : '#89818a');
      });
    }
  }

  private moveSelection(direction: number): void {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, CHARACTERS.length);
    this.render();
  }

  private makeArrow(x: number, y: number, label: string, action: () => void): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif', fontSize: '42px', color: '#f2e8d4', backgroundColor: '#5b3d32',
      padding: { x: 12, y: 4 }
    }).setOrigin(0.5).setFixedSize(72, 80).setInteractive({ useHandCursor: true });
    button.on('pointerup', action);
  }

  private makeButton(x: number, y: number, label: string, action: () => void, width: number, fontSize: number, height: number): void {
    const button = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif', fontSize: fontSize + 'px', color: '#f2e8d4',
      backgroundColor: '#5b3d32', padding: { x: 16, y: height > 46 ? 22 : 12 }
    }).setFixedSize(width, height).setInteractive({ useHandCursor: true });
    button.on('pointerup', action);
    button.on('pointerover', () => button.setStyle({ backgroundColor: '#79513c', color: '#ffffff' }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: '#5b3d32', color: '#f2e8d4' }));
  }

  private returnToSelection(): void {
    const character = CHARACTERS[this.selectedIndex] ?? CHARACTERS[0]!;
    this.scene.start('character-select', { characterId: character.id });
  }

  private assertBrowserTestMode(): void {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Browser test bridge is disabled.');
  }
}
