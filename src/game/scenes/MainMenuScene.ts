import Phaser from 'phaser';
import { drawUiBackdrop, drawUiPanel, preloadUiArt } from '../ui/dark-fantasy-theme.js';
import { beginNewGamePlus, canStartNewGamePlus } from '../../gameplay/run/new-game-plus-runtime.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

type MainMenuItem = 'new-run' | 'hunter-hub' | 'story-journal' | 'collection-archive' | 'new-game-plus' | 'settings';

export class MainMenuScene extends Phaser.Scene {
  private selectedItem: MainMenuItem = 'new-run';
  private previousPadConfirm = false;
  private previousPadBack = false;
  private previousPadNavigation = '';
  private playButton?: Phaser.GameObjects.Text;
  private hubButton?: Phaser.GameObjects.Text;
  private newGamePlusButton?: Phaser.GameObjects.Text;
  private journalButton?: Phaser.GameObjects.Text;
  private settingsButton?: Phaser.GameObjects.Text;
  private collectionButton?: Phaser.GameObjects.Text;
  private newGamePlusAvailable = false;
  private newGamePlusLevel = 0;
  private confirmationOpen = false;
  private confirmationSelected = true;
  private confirmationObjects: Phaser.GameObjects.GameObject[] = [];
  private confirmationStatus?: Phaser.GameObjects.Text;

  constructor() { super('main-menu'); }

  preload(): void { preloadUiArt(this); }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b0b10');

    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager?.load();
    if (loaded && 'data' in loaded) {
      this.newGamePlusAvailable = canStartNewGamePlus(loaded.data);
      this.newGamePlusLevel = loaded.data.progression.newGamePlusLevel;
    }

    drawUiBackdrop(this, 'menu');
    const progression = loaded && 'data' in loaded ? loaded.data.progression : undefined;
    if (w >= 1120) {
      const soulEssence = progression?.soulEssence ?? 0;
      const hunterCount = progression?.unlockedCharacterIds.length ?? 1;
      const regionCount = progression?.unlockedRegionIds.length ?? 1;
      const dossierX = w - 286;
      drawUiPanel(this, dossierX, 224, 238, 194, 0x9b8059, -10, 0.82);
      this.add.text(dossierX + 20, 242, 'AVCI KAYDI', { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#e6d5b8', fontStyle: 'bold', letterSpacing: 1 });
      this.add.rectangle(dossierX + 20, 272, 198, 1, 0xb99a61, 0.55).setOrigin(0, 0);
      this.add.text(dossierX + 20, 292, 'RUH ÖZÜ', { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#b99a61', fontStyle: 'bold', letterSpacing: 2 });
      this.add.text(dossierX + 20, 310, soulEssence.toLocaleString('tr-TR'), { fontFamily: 'Georgia, serif', fontSize: '25px', color: '#f0e6d6', fontStyle: 'bold' });
      this.add.text(dossierX + 20, 354, 'AVCILAR', { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#b99a61', fontStyle: 'bold', letterSpacing: 1 });
      this.add.text(dossierX + 104, 354, hunterCount + ' / 5', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#e0d3bf' });
      this.add.text(dossierX + 20, 382, 'BÖLGELER', { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#b99a61', fontStyle: 'bold', letterSpacing: 1 });
      this.add.text(dossierX + 104, 382, regionCount + ' / 5', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#e0d3bf' });
    }

    // The artwork remains a clean background; every menu control is real Phaser UI.
    this.add.rectangle(220, h / 2, 440, h, 0x05080e, 0.48).setDepth(-997);
    const frame = this.add.graphics().setDepth(-996);
    frame.lineStyle(1, 0xc6a56b, 0.34);
    frame.lineBetween(66, 232, 390, 232);
    frame.lineBetween(66, h - 72, 390, h - 72);
    frame.lineStyle(2, 0xc6a56b, 0.42);
    frame.lineBetween(66, 232, 92, 232);
    frame.lineBetween(66, 232, 66, 258);

    this.add.text(w * 0.64, 70, 'BEYOND THE VEIL', {
      fontFamily: 'Georgia, serif', fontSize: '46px', color: '#eee4d0',
      fontStyle: 'bold', letterSpacing: 5, stroke: '#090d13', strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.add.text(w * 0.64, 132, 'ÖLÜMÜN ÖTESİNDE, AV BAŞLAR.', {
      fontFamily: 'Georgia, serif', fontSize: '16px', color: '#c3a675',
      letterSpacing: 3
    }).setOrigin(0.5, 0);
    this.add.text(88, 202, 'YOLUNU SEÇ', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#a99b84',
      fontStyle: 'bold', letterSpacing: 3
    }).setOrigin(0, 0);

    const firstY = Math.round(h * 0.43);
    const rowGap = Math.round(h * 0.081);
    const menuStyle = {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#d8d0c3',
      backgroundColor: '#151b22', padding: { x: 18, y: 10 }
    } as const;
    const createMenuButton = (y: number, label: string): Phaser.GameObjects.Text =>
      this.add.text(88, y, label, menuStyle)
        .setFixedSize(300, 44)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });

    this.playButton = createMenuButton(firstY, '›  YENİ KOŞU');
    this.playButton.on('pointerover', () => this.setSelectedItem('new-run'));
    this.playButton.on('pointerup', () => this.startNewRun());

    this.hubButton = createMenuButton(firstY + rowGap, '   AVCI KARARGÂHI');
    this.hubButton.on('pointerover', () => this.setSelectedItem('hunter-hub'));
    this.hubButton.on('pointerup', () => this.openHunterHub());

    this.journalButton = createMenuButton(firstY + rowGap * 2, '   HİKÂYE DEFTERİ');
    this.journalButton.on('pointerover', () => this.setSelectedItem('story-journal'));
    this.journalButton.on('pointerup', () => this.openQuestJournal());

    this.collectionButton = createMenuButton(firstY + rowGap * 3, '   KOLEKSİYON');
    this.collectionButton.on('pointerover', () => this.setSelectedItem('collection-archive'));
    this.collectionButton.on('pointerup', () => this.openCollectionArchive());

    if (this.newGamePlusAvailable) {
      this.newGamePlusButton = createMenuButton(firstY + rowGap * 4, '   NG+ DÖNGÜSÜ');
      this.newGamePlusButton.on('pointerover', () => this.setSelectedItem('new-game-plus'));
      this.newGamePlusButton.on('pointerup', () => this.openNewGamePlusConfirmation());
      this.add.text(108, firstY + rowGap * 4 + 25, 'NG+' + Math.min(5, this.newGamePlusLevel + 1) + '  •  ZORLUK ARTIŞI', {
        fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#b59a70'
      });
    }

    const settingsSlot = this.newGamePlusAvailable ? 5 : 4;
    this.settingsButton = createMenuButton(firstY + rowGap * settingsSlot, '   AYARLAR');
    this.settingsButton.on('pointerover', () => this.setSelectedItem('settings'));
    this.settingsButton.on('pointerup', () => this.openSettings());

    this.setSelectedItem(this.selectedItem);

    this.add.text(88, h - 45, 'OKLAR: SEÇ    ENTER / SPACE / A: ONAYLA', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#a99b84'
    });
    this.add.text(w - 34, h - 42, 'BEYOND THE VEIL', {
      fontFamily: 'Georgia, serif', fontSize: '11px', color: '#8d887e',
      letterSpacing: 2
    }).setOrigin(1, 0);
    
    this.input.keyboard?.on('keydown-LEFT', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.confirmationOpen) this.setConfirmationSelection(false);
      else this.navigateMenu(-1);
    });
    this.input.keyboard?.on('keydown-UP', (event: KeyboardEvent) => {
      if (!event.repeat && !this.confirmationOpen) this.navigateMenu(-1);
    });
    this.input.keyboard?.on('keydown-RIGHT', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.confirmationOpen) this.setConfirmationSelection(true);
      else this.navigateMenu(1);
    });
    this.input.keyboard?.on('keydown-DOWN', (event: KeyboardEvent) => {
      if (!event.repeat && !this.confirmationOpen) this.navigateMenu(1);
    });
    this.input.keyboard?.on('keydown-J', (event: KeyboardEvent) => {
      if (!event.repeat && !this.confirmationOpen) this.openQuestJournal();
    });
    this.input.keyboard?.on('keydown-C', (event: KeyboardEvent) => {
      if (!event.repeat && !this.confirmationOpen) this.openCollectionArchive();
    });
    this.input.keyboard?.on('keydown-S', (event: KeyboardEvent) => {
      if (!event.repeat && !this.confirmationOpen) this.openSettings();
    });
    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.confirmationOpen) this.closeNewGamePlusConfirmation();
    });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (!event.repeat) this.activateSelectedItem();
    });
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!event.repeat) this.activateSelectedItem();
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = resolveRemoteAction(event);
      if (!action) return;
      event.preventDefault();
      if (action === 'back' || action === 'red') {
        if (this.confirmationOpen) this.closeNewGamePlusConfirmation();
      } else if (action === 'confirm' || action === 'green') this.activateSelectedItem();
      else if (action === 'yellow') this.openQuestJournal();
      else if (action === 'blue') this.openHunterHub();
    });
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) {
      this.previousPadConfirm = false;
      this.previousPadBack = false;
      this.previousPadNavigation = '';
      return;
    }

    const confirm = Boolean(pad.A || pad.buttons[9]?.pressed);
    const back = Boolean(pad.B);
    if (this.confirmationOpen) {
      if (confirm && !this.previousPadConfirm) {
        if (this.confirmationSelected) this.confirmNewGamePlus();
        else this.closeNewGamePlusConfirmation();
      }
      if (back && !this.previousPadBack) this.closeNewGamePlusConfirmation();
      const left = pad.left || pad.leftStick.x < -0.5;
      const right = pad.right || pad.leftStick.x > 0.5;
      const direction = left ? 'left' : right ? 'right' : '';
      if (direction && direction !== this.previousPadNavigation) this.setConfirmationSelection(direction === 'right');
      this.previousPadNavigation = direction;
      this.previousPadConfirm = confirm;
      this.previousPadBack = back;
      return;
    }

    if (confirm && !this.previousPadConfirm) this.activateSelectedItem();
    this.previousPadConfirm = confirm;
    this.previousPadBack = back;

    const dpadUp = pad.up;
    const dpadDown = pad.down;
    const dpadLeft = pad.left;
    const dpadRight = pad.right;
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
      this.navigateMenu(direction === 'left' || direction === 'up' ? -1 : 1);
    }
    this.previousPadNavigation = direction;
  }

  private menuItems(): MainMenuItem[] {
    return this.newGamePlusAvailable
      ? ['new-run', 'hunter-hub', 'story-journal', 'collection-archive', 'new-game-plus', 'settings']
      : ['new-run', 'hunter-hub', 'story-journal', 'collection-archive', 'settings'];
  }

  private navigateMenu(direction: number): void {
    const items = this.menuItems();
    const current = Math.max(0, items.indexOf(this.selectedItem));
    this.setSelectedItem(items[(current + direction + items.length) % items.length]!);
  }

  private setSelectedItem(item: MainMenuItem): void {
    if (item === 'new-game-plus' && !this.newGamePlusAvailable) item = 'new-run';
    this.selectedItem = item;
    this.playButton?.setText(item === 'new-run' ? '›  YENİ KOŞU' : '   YENİ KOŞU');
    this.hubButton?.setText(item === 'hunter-hub' ? '›  AVCI KARARGÂHI' : '   AVCI KARARGÂHI');
    this.journalButton?.setText(item === 'story-journal' ? '›  HİKÂYE DEFTERİ' : '   HİKÂYE DEFTERİ');
    this.collectionButton?.setText(item === 'collection-archive' ? '›  KOLEKSİYON' : '   KOLEKSİYON');
    this.newGamePlusButton?.setText(item === 'new-game-plus' ? '›  NG+ DÖNGÜSÜ' : '   NG+ DÖNGÜSÜ');
    this.settingsButton?.setText(item === 'settings' ? '›  AYARLAR' : '   AYARLAR');
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
    this.newGamePlusButton?.setStyle({
      backgroundColor: item === 'new-game-plus' ? '#654d36' : '#29212b',
      color: item === 'new-game-plus' ? '#fff0ce' : '#e7c98e',
      fontStyle: item === 'new-game-plus' ? 'bold' : 'normal'
    });
    this.journalButton?.setStyle({
      backgroundColor: item === 'story-journal' ? '#5b4938' : '#211b24',
      color: item === 'story-journal' ? '#fff0ce' : '#d9c9aa',
      fontStyle: item === 'story-journal' ? 'bold' : 'normal'
    });
    this.collectionButton?.setStyle({
      backgroundColor: item === 'collection-archive' ? '#5b4938' : '#211b24',
      color: item === 'collection-archive' ? '#fff0ce' : '#d9c9aa',
      fontStyle: item === 'collection-archive' ? 'bold' : 'normal'
    });
    this.settingsButton?.setStyle({
      backgroundColor: item === 'settings' ? '#5b4938' : '#211b24',
      color: item === 'settings' ? '#fff0ce' : '#d9c9aa',
      fontStyle: item === 'settings' ? 'bold' : 'normal'
    });
  }

  private activateSelectedItem(): void {
    if (this.confirmationOpen) {
      if (this.confirmationSelected) this.confirmNewGamePlus();
      else this.closeNewGamePlusConfirmation();
    } else if (this.selectedItem === 'new-run') this.startNewRun();
    else if (this.selectedItem === 'new-game-plus') this.openNewGamePlusConfirmation();
    else if (this.selectedItem === 'story-journal') this.openQuestJournal();
    else if (this.selectedItem === 'settings') this.openSettings();
    else if (this.selectedItem === 'collection-archive') this.openCollectionArchive();
    else this.openHunterHub();
  }

  private startNewRun(): void {
    this.scene.start('character-select');
  }

  private openNewGamePlusConfirmation(): void {
    if (!this.newGamePlusAvailable || this.confirmationOpen) return;
    const w = this.scale.width;
    const h = this.scale.height;
    this.confirmationOpen = true;
    this.confirmationSelected = true;
    this.previousPadNavigation = '';
    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x050408, 0.88).setDepth(50).setInteractive();
    const panel = this.add.rectangle(w / 2, h / 2, 660, 350, 0x17131c, 1).setStrokeStyle(2, 0xb99a61, 0.9).setDepth(51).setInteractive();
    const title = this.add.text(w / 2, h / 2 - 118, 'YENİ DÖNGÜYE BAŞLA?', {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#e9dfcb', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(52);
    const description = this.add.text(w / 2, h / 2 - 38,
      'Hikâye ve bölge ilerlemesi Lanetli Orman’dan yeniden başlayacak.\nAvcılar, Ruh Özü, kalıcı geliştirmeler, kalıntılar ve koleksiyonlar korunacak.\nNG+' + (this.newGamePlusLevel + 1) + ' zorluğu etkinleşecek.',
      { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c7b9aa', align: 'center', lineSpacing: 9 }
    ).setOrigin(0.5).setDepth(52);
    this.confirmationStatus = this.add.text(w / 2, h / 2 + 72, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#e29a8d', align: 'center'
    }).setOrigin(0.5).setDepth(52);
    const confirm = this.add.text(w / 2 - 145, h / 2 + 125, 'DÖNGÜYÜ BAŞLAT', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#fff0ce',
      backgroundColor: '#654d36', padding: { x: 20, y: 13 }
    }).setOrigin(0.5).setDepth(53).setInteractive({ useHandCursor: true });
    const cancel = this.add.text(w / 2 + 145, h / 2 + 125, 'VAZGEÇ', {
      fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#d0c5b8',
      backgroundColor: '#30272a', padding: { x: 24, y: 13 }
    }).setOrigin(0.5).setDepth(53).setInteractive({ useHandCursor: true });
    confirm.on('pointerover', () => this.setConfirmationSelection(true));
    confirm.on('pointerup', () => this.confirmNewGamePlus());
    cancel.on('pointerover', () => this.setConfirmationSelection(false));
    cancel.on('pointerup', () => this.closeNewGamePlusConfirmation());
    this.confirmationObjects = [shade, panel, title, description, this.confirmationStatus, confirm, cancel];
    this.setConfirmationSelection(true);
  }

  private setConfirmationSelection(confirm: boolean): void {
    this.confirmationSelected = confirm;
    const confirmButton = this.confirmationObjects.find(object => object instanceof Phaser.GameObjects.Text && object.text === 'DÖNGÜYÜ BAŞLAT') as Phaser.GameObjects.Text | undefined;
    const cancelButton = this.confirmationObjects.find(object => object instanceof Phaser.GameObjects.Text && object.text === 'VAZGEÇ') as Phaser.GameObjects.Text | undefined;
    confirmButton?.setStyle({ backgroundColor: confirm ? '#795c3d' : '#3a302b', color: confirm ? '#fff4d8' : '#c5b9aa', fontStyle: confirm ? 'bold' : 'normal' });
    cancelButton?.setStyle({ backgroundColor: confirm ? '#30272a' : '#79513c', color: confirm ? '#d0c5b8' : '#ffffff', fontStyle: confirm ? 'normal' : 'bold' });
  }

  private closeNewGamePlusConfirmation(): void {
    if (!this.confirmationOpen) return;
    this.confirmationObjects.forEach(object => object.destroy());
    this.confirmationObjects = [];
    this.confirmationStatus = undefined;
    this.confirmationOpen = false;
    this.previousPadNavigation = '';
  }

  private confirmNewGamePlus(): void {
    if (!this.confirmationOpen) return;
    const manager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = manager?.load();
    if (!manager || !loaded || !('data' in loaded)) {
      this.confirmationStatus?.setText('KAYIT OKUNAMADI. İLERLEMEN KORUNDU.');
      return;
    }
    const next = beginNewGamePlus(loaded.data);
    if (!next) {
      this.confirmationStatus?.setText('NEW GAME+ HENÜZ AÇILMADI.');
      return;
    }
    try {
      manager.save(next);
      this.closeNewGamePlusConfirmation();
      this.scene.start('character-select');
    } catch {
      this.confirmationStatus?.setText('KAYIT BAŞARISIZ. İLERLEMEN KORUNDU.');
    }
  }

  private openQuestJournal(): void {
    if (this.confirmationOpen) return;
    this.scene.pause();
    this.scene.launch('quest-journal', { returnScene: 'main-menu' });
  }

  private openCollectionArchive(): void {
    if (this.confirmationOpen) return;
    this.scene.pause();
    this.scene.launch('collection-archive');
  }

  private openSettings(): void {
    this.scene.pause();
    this.scene.launch('settings', { returnScene: 'main-menu' });
  }

  private openHunterHub(): void {
    this.scene.start('hunter-hub');
  }
}
