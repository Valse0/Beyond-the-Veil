import Phaser from 'phaser';
import { drawUiBackdrop, drawUiPanel } from '../ui/dark-fantasy-theme.js';
import type { ChallengeId, GameMode } from '../../core/types/game.js';
import type { RegionId } from '../../core/types/content.js';
import { CHARACTERS } from '../../data/characters.js';
import { REGIONS } from '../../data/regions.js';
import { CHALLENGES } from '../../data/challenges.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { RELICS } from '../../data/relics.js';
import type { EquipmentProfile } from '../../gameplay/progression/equipment-profiles.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

type PreparationData = {
  characterId?: string;
  regionId?: string;
  gameMode?: unknown;
  challengeId?: unknown;
  selectedProfileId?: string | null;
};

type ProfileOption = EquipmentProfile | null;

export class RunPreparationScene extends Phaser.Scene {
  private characterId = CHARACTERS[0]!.id;
  private regionId: RegionId = REGIONS[0]!.id;
  private gameMode: GameMode = 'survival';
  private challengeId: ChallengeId | null = null;
  private profiles: EquipmentProfile[] = [];
  private options: ProfileOption[] = [null];
  private globallyEquippedRelicIds: string[] = [];
  private selectedIndex = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private previousPad = { left: false, right: false, confirm: false, back: false, next: false, previous: false };
  private statusText?: Phaser.GameObjects.Text;
  private touchLayout = false;
  private requestedProfileId: string | null | undefined;

  constructor() {
    super('run-preparation');
  }

  init(data: PreparationData): void {
    this.characterId = CHARACTERS.some(character => character.id === data?.characterId)
      ? data.characterId!
      : CHARACTERS[0]!.id;
    this.regionId = REGIONS.some(region => region.id === data?.regionId)
      ? data.regionId as RegionId
      : REGIONS[0]!.id;
    this.gameMode = data?.gameMode === 'boss-hunt' || data?.gameMode === 'challenge' || data?.gameMode === 'endless'
      ? data.gameMode
      : 'survival';
    this.challengeId = this.gameMode === 'challenge' && CHALLENGES.some(challenge => challenge.id === data?.challengeId)
      ? data.challengeId as ChallengeId
      : this.gameMode === 'challenge' ? CHALLENGES[0]!.id : null;
    this.profiles = [];
    this.options = [null];
    this.globallyEquippedRelicIds = [];
    this.selectedIndex = 0;
    this.frames = [];
    this.previousPad = { left: false, right: false, confirm: false, back: false, next: false, previous: false };
    this.statusText = undefined;
    this.touchLayout = false;
    this.requestedProfileId = data?.selectedProfileId;
  }

  create(): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager?.load();
    if (loaded && 'data' in loaded) {
      const save = loaded.data;
      if (!save.progression.unlockedCharacterIds.includes(this.characterId)) this.characterId = CHARACTERS[0]!.id;
      if (!save.progression.unlockedRegionIds.includes(this.regionId)) this.regionId = REGIONS[0]!.id;
      this.profiles = [...(save.progression.equipmentProfiles[this.characterId] ?? [])];
      this.globallyEquippedRelicIds = [...save.progression.equippedRelicIds];
      this.options = [null, ...this.profiles];
      if (this.requestedProfileId !== undefined) {
        const requestedIndex = this.requestedProfileId === null ? 0 : this.options.findIndex(option => option?.id === this.requestedProfileId);
        this.selectedIndex = requestedIndex >= 0 ? requestedIndex : 0;
      } else {
        const activeId = save.progression.activeEquipmentProfileIds[this.characterId];
        const activeIndex = this.options.findIndex(option => option?.id === activeId);
        this.selectedIndex = activeIndex >= 0 ? activeIndex : 0;
      }
    }

    const width = this.scale.width;
    const height = this.scale.height;
    this.touchLayout = this.sys.game.device.input.touch;
    const character = CHARACTERS.find(item => item.id === this.characterId) ?? CHARACTERS[0]!;
    const region = REGIONS.find(item => item.id === this.regionId) ?? REGIONS[0]!;
    const modeLabel = this.gameMode === 'boss-hunt' ? 'BOSS HUNT'
      : this.gameMode === 'challenge' ? 'MEYDAN OKUMA'
      : this.gameMode === 'endless' ? 'SONSUZ' : 'SURVIVAL';
    this.cameras.main.setBackgroundColor('#0b0b10');

    drawUiBackdrop(this, 'preparation');

    this.add.text(58, 32, 'KOŞU HAZIRLIĞI', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '40px' : '34px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(62, 78, 'Avcını, bölgeni ve başlangıç dizilimini son kez kontrol et.', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '18px' : '14px', color: '#b8aaa0'
    });

    drawUiPanel(this, 58, 132, 340, 470, 0x9a8058, 0, 0.97);
    this.add.text(82, 154, 'KOŞU BİLGİSİ', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '21px' : '18px', color: '#d9c9aa', fontStyle: 'bold'
    });
    this.add.text(82, 202, character.name, {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '30px' : '25px', color: '#f0e6d6', fontStyle: 'bold',
      wordWrap: { width: 290 }
    });
    this.add.text(82, 240, character.role + '\n' + character.description, {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '16px' : '13px', color: '#aaa2a0',
      wordWrap: { width: 286 }, lineSpacing: 5
    });
    this.add.text(82, 326, 'BÖLGE', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '11px', color: '#b99a61', fontStyle: 'bold'
    });
    this.add.text(82, 348, region.name, {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '24px' : '20px', color: '#f0e6d6',
      wordWrap: { width: 286 }
    });
    this.add.text(82, 392, region.subtitle + '\n' + region.atmosphere, {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '12px', color: '#aaa2a0',
      wordWrap: { width: 286 }, lineSpacing: 4
    });
    this.add.text(82, 492, 'MOD', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#b99a61', fontStyle: 'bold'
    });
    this.add.text(82, 514, modeLabel + (this.challengeId ? '  •  ' + (CHALLENGES.find(item => item.id === this.challengeId)?.name ?? '') : ''), {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '14px', color: '#e7d8bc',
      wordWrap: { width: 286 }
    });
    this.add.text(82, 562, 'Yetenek: ' + character.activeAbility, {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '12px', color: '#c7ad7b',
      wordWrap: { width: 286 }
    });

    const panel = this.add.graphics();
    panel.fillStyle(0x17161b, 0.96);
    panel.fillRoundedRect(420, 132, width - 478, 470, 14);
    panel.lineStyle(1, 0x76634b, 0.8);
    panel.strokeRoundedRect(420, 132, width - 478, 470, 14);
    this.add.text(446, 154, 'BAŞLANGIÇ DİZİLİMİ', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#d9c9aa', fontStyle: 'bold'
    });
    this.add.text(width - 86, 158, this.touchLayout ? 'ÖNCEKİ / SONRAKİ' : '◀  ▶ SEÇ', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '14px' : '10px', color: '#89818a'
    }).setOrigin(1, 0);

    const cardWidth = this.touchLayout ? width - 530 : (width - 530) / 2;
    const cardHeight = this.touchLayout ? 250 : 112;
    const startX = 446;
    const startY = this.touchLayout ? 238 : 194;
    this.options.forEach((option, index) => {
      if (this.touchLayout && index !== this.selectedIndex) return;
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = this.touchLayout ? startX : startX + column * (cardWidth + 18);
      const y = this.touchLayout ? startY : startY + row * 124;
      const frame = this.add.graphics();
      this.frames.push(frame);
      const weapon = option ? WEAPONS.find(item => item.id === option.startingWeaponId) : WEAPONS.find(item => item.id === character.startingWeaponId);
      const passive = option ? PASSIVES.find(item => item.id === option.startingPassiveId) : PASSIVES.find(item => item.id === character.startingPassiveId);
      const relicIds = option ? option.relicIds : this.globallyEquippedRelicIds;
      const relics = relicIds.map(id => RELICS.find(item => item.id === id)).filter((item): item is (typeof RELICS)[number] => Boolean(item));
      const title = option ? option.name : 'Avcının varsayılanı';
      const weaponName = weapon?.name ?? 'Bilinmeyen silah';
      const passiveName = passive?.name ?? 'Bilinmeyen pasif';
      const relicLine = relics.length ? relics.map(item => item.name).join(' • ') : 'Ek kalıntı yok';
      this.add.text(x + 16, y + 12, title, {
        fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '26px' : '16px', color: '#f0e6d6', fontStyle: 'bold',
        wordWrap: { width: cardWidth - 32 }
      });
      this.add.text(x + 16, y + 39, 'SİLAH  ' + weaponName + '    •    PASİF  ' + passiveName, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '18px' : '10px', color: '#c7ad7b',
        wordWrap: { width: cardWidth - 32 }
      });
      this.add.text(x + 16, y + 66, 'KALINTILAR  ' + relicLine, {
        fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '18px' : '10px', color: '#aaa2a0',
        wordWrap: { width: cardWidth - 32 }
      });
      const hit = this.add.zone(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.selectProfile(index));
    });

    if (this.touchLayout) {
      this.makeTouchArrow(422, 350, '‹', () => this.moveSelection(-1));
      this.makeTouchArrow(width - 78, 350, '›', () => this.moveSelection(1));
    }

    this.statusText = this.add.text(448, this.touchLayout ? 530 : 574, this.options.length > 1
      ? 'Seçili profil bu koşuda kullanılır; kayıtlı aktif profilin değiştirilmez.'
      : 'Henüz kayıtlı profilin yok. Avcının varsayılan dizilimi kullanılacak.', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '16px' : '11px', color: '#89818a',
      wordWrap: { width: width - 540 }
    });

    this.makeButton(58, height - 102, '‹  BÖLGEYE GERİ DÖN', () => this.goBack(), this.touchLayout ? 250 : 220, this.touchLayout ? 18 : 14, this.touchLayout ? 82 : 44);
    this.makeButton(width - (this.touchLayout ? 292 : 270), height - 88, 'KOŞUYU BAŞLAT  ›', () => this.startRun(), this.touchLayout ? 230 : 212, this.touchLayout ? 18 : 14, this.touchLayout ? 82 : 44);
    this.add.text(width / 2, height - 8, '← / → veya D-PAD: DİZİLİM     A / ENTER: BAŞLAT     B / ESC: GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '10px', color: '#77727a'
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startRun());
    this.input.keyboard?.on('keydown-SPACE', () => this.startRun());
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.goBack());
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red') this.goBack();
      else if (action === 'confirm' || action === 'green') this.startRun();
      else if (action === 'yellow') this.moveSelection(1);
      else if (action === 'blue') this.moveSelection(-1);
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
    const next = Boolean(pad.buttons[3]?.pressed);
    const previous = Boolean(pad.buttons[2]?.pressed);
    if (left && !this.previousPad.left) this.moveSelection(-1);
    if (right && !this.previousPad.right) this.moveSelection(1);
    if (confirm && !this.previousPad.confirm) this.startRun();
    if (back && !this.previousPad.back) this.goBack();
    if (next && !this.previousPad.next) this.moveSelection(1);
    if (previous && !this.previousPad.previous) this.moveSelection(-1);
    this.previousPad = { left, right, confirm, back, next, previous };
  }

  browserTestSnapshot(): {
    characterId: string;
    regionId: string;
    gameMode: GameMode;
    challengeId: ChallengeId | null;
    selectedProfileId: string | null;
    selectedWeaponId: string;
    selectedPassiveId: string;
    selectedRelicIds: string[];
    profileCount: number;
    layoutMode: 'touch' | 'desktop';
  } {
    this.assertBrowserTestMode();
    const character = CHARACTERS.find(item => item.id === this.characterId) ?? CHARACTERS[0]!;
    const option = this.options[this.selectedIndex] ?? null;
    return {
      characterId: this.characterId,
      regionId: this.regionId,
      gameMode: this.gameMode,
      challengeId: this.challengeId,
      selectedProfileId: option?.id ?? null,
      selectedWeaponId: option?.startingWeaponId ?? character.startingWeaponId,
      selectedPassiveId: option?.startingPassiveId ?? character.startingPassiveId,
      selectedRelicIds: option ? [...option.relicIds] : [...this.globallyEquippedRelicIds],
      profileCount: this.profiles.length,
      layoutMode: this.touchLayout ? 'touch' : 'desktop'
    };
  }

  private assertBrowserTestMode(): void {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Browser test bridge is disabled.');
  }

  private selectProfile(index: number): void {
    const nextIndex = Phaser.Math.Clamp(index, 0, this.options.length - 1);
    if (this.touchLayout) {
      const option = this.options[nextIndex] ?? null;
      this.scene.restart({ characterId: this.characterId, regionId: this.regionId, gameMode: this.gameMode, challengeId: this.challengeId ?? undefined, selectedProfileId: option?.id ?? null });
      return;
    }
    this.selectedIndex = nextIndex;
    this.refreshSelection();
  }

  private moveSelection(direction: number): void {
    this.selectProfile(Phaser.Math.Wrap(this.selectedIndex + direction, 0, this.options.length));
  }

  private refreshSelection(): void {
    const width = this.scale.width;
    const cardWidth = this.touchLayout ? width - 530 : (width - 530) / 2;
    const cardHeight = this.touchLayout ? 250 : 112;
    const startX = 446;
    const startY = this.touchLayout ? 238 : 194;
    this.frames.forEach((frame, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = this.touchLayout ? startX : startX + column * (cardWidth + 18);
      const y = this.touchLayout ? startY : startY + row * 124;
      const selected = this.touchLayout || index === this.selectedIndex;
      frame.clear();
      frame.fillStyle(selected ? 0x30251f : 0x17161b, selected ? 0.98 : 0.78);
      frame.fillRoundedRect(x, y, cardWidth, cardHeight, 10);
      frame.lineStyle(selected ? 3 : 1, selected ? 0xd4b777 : 0x51484a, selected ? 1 : 0.7);
      frame.strokeRoundedRect(x, y, cardWidth, cardHeight, 10);
      if (selected) {
        frame.fillStyle(0xd4b777, 1);
        frame.fillRoundedRect(x + 16, y + cardHeight - 7, cardWidth - 32, 3, 2);
      }
    });
    const option = this.options[this.selectedIndex] ?? null;
    if (this.statusText) {
      this.statusText.setText(option
        ? 'Bu koşuda "' + option.name + '" profili kullanılacak. Kayıtlı aktif profilin değişmez.'
        : 'Bu koşuda ' + (CHARACTERS.find(item => item.id === this.characterId)?.name ?? 'avcı') + ' varsayılan dizilimi kullanılacak.');
    }
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

  private goBack(): void {
    this.scene.start('region-select', {
      characterId: this.characterId,
      regionId: this.regionId,
      gameMode: this.gameMode,
      challengeId: this.challengeId ?? undefined
    });
  }

  private startRun(): void {
    const region = REGIONS.find(item => item.id === this.regionId);
    if (!region) return;
    const option = this.options[this.selectedIndex] ?? null;
    this.scene.start('run', {
      characterId: this.characterId,
      regionId: this.regionId,
      gameMode: this.gameMode,
      challengeId: this.challengeId ?? undefined,
      equipmentProfileId: option?.id ?? null
    });
  }
}
