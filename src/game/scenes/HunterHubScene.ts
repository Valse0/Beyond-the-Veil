import Phaser from 'phaser';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { PERMANENT_UPGRADES, getPermanentUpgradeCost } from '../../gameplay/progression/permanent-upgrades.js';

const UPGRADES = PERMANENT_UPGRADES;

export class HunterHubScene extends Phaser.Scene {
  private essenceText?: Phaser.GameObjects.Text;
  private levelTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private costTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private buttonBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private buttonTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private respecButton?: Phaser.GameObjects.Text;
  private respecDialog?: Phaser.GameObjects.Container;
  private respecDialogStatus?: Phaser.GameObjects.Text;
  private respecCancelBg?: Phaser.GameObjects.Rectangle;
  private respecConfirmBg?: Phaser.GameObjects.Rectangle;
  private selectedIndex = 0;
  private respecDialogSelection: 'cancel' | 'confirm' = 'cancel';
  private previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };
  private navKeys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('hunter-hub');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b0b10');
    this.levelTexts.clear();
    this.costTexts.clear();
    this.buttonBgs.clear();
    this.buttonTexts.clear();
    this.selectedIndex = 0;
    this.respecDialog = undefined;
    this.respecDialogStatus = undefined;
    this.respecCancelBg = undefined;
    this.respecConfirmBg = undefined;
    this.respecDialogSelection = 'cancel';
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x17131c, 1);
    backdrop.fillCircle(width * 0.5, height * 0.4, 380);
    backdrop.lineStyle(1, 0xb99a61, 0.25);
    backdrop.strokeCircle(width * 0.5, height * 0.4, 340);

    this.add.text(64, 42, 'AVCI KARARGAHI', {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 88, 'Topladığın Ruh Özü ile kalıcı mühürleri ve avcı yeteneklerini geliştir.', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#b8aaa0'
    });

    this.navKeys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,ENTER,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;

    this.essenceText = this.add.text(width - 64, 52, '', {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#f0d9b5', fontStyle: 'bold'
    }).setOrigin(1, 0);

    const startY = 145;
    const cardHeight = 72;
    const cardWidth = width - 128;
    const leftX = 64;

    UPGRADES.forEach((upgrade, index) => {
      const y = startY + index * (cardHeight + 10);
      this.add.rectangle(leftX + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight, 0x1d1720, 0.9)
        .setStrokeStyle(1, 0xb99a61, 0.3);

      this.add.text(leftX + 24, y + 18, upgrade.name, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e8d4', fontStyle: 'bold'
      });
      this.add.text(leftX + 24, y + 44, upgrade.description, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#a89c96'
      });

      const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
      const currentLevel = saveManager ? saveManager.getPermanentUpgradeLevel(upgrade.id) : 0;
      const cost = getPermanentUpgradeCost(upgrade.id, currentLevel) ?? upgrade.baseCost * (currentLevel + 1);

      const levelText = this.add.text(leftX + 460, y + cardHeight / 2, `Seviye ${currentLevel} / ${upgrade.maxLevel}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#d9c9aa'
      }).setOrigin(0, 0.5);
      this.levelTexts.set(upgrade.id, levelText);

      const costText = this.add.text(leftX + 640, y + cardHeight / 2, currentLevel >= upgrade.maxLevel ? 'MAX' : `${cost} Öz`, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: currentLevel >= upgrade.maxLevel ? '#888888' : '#f0d9b5', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.costTexts.set(upgrade.id, costText);

      const isMax = currentLevel >= upgrade.maxLevel;
      const btnBg = this.add.rectangle(leftX + cardWidth - 85, y + cardHeight / 2, 130, 40, isMax ? 0x2b2528 : 0x5b3d32, 1)
        .setStrokeStyle(1, 0xb99a61, isMax ? 0.2 : 0.6)
        .setInteractive({ useHandCursor: !isMax });
      this.buttonBgs.set(upgrade.id, btnBg);

      const btnText = this.add.text(leftX + cardWidth - 85, y + cardHeight / 2, isMax ? 'TAMAMLANDI' : 'GELİŞTİR', {
        fontFamily: 'Arial, sans-serif', fontSize: '13px', color: isMax ? '#888888' : '#f2e8d4', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.buttonTexts.set(upgrade.id, btnText);

      if (!isMax) {
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x79513c));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x5b3d32));
        btnBg.on('pointerup', () => this.purchaseUpgrade(upgrade.id, cost, upgrade.maxLevel));
      }
    });

    const backBtn = this.add.text(64, height - 60, '← ANA MENÜYE DÖN', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#b8aaa0',
      backgroundColor: '#1d1720', padding: { x: 18, y: 10 }
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ffffff', backgroundColor: '#2d2430' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#b8aaa0', backgroundColor: '#1d1720' }));
    backBtn.on('pointerup', () => this.scene.start('main-menu'));

    this.respecButton = this.add.text(width - 64, height - 60, '↻ YENİDEN DAĞIT', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#d9c9aa',
      backgroundColor: '#2b2528', padding: { x: 18, y: 10 }
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.respecButton.on('pointerover', () => { this.selectedIndex = UPGRADES.length; this.highlightSelected(); });
    this.respecButton.on('pointerout', () => this.highlightSelected());
    this.respecButton.on('pointerup', () => this.openRespecDialog());

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.respecDialog) this.closeRespecDialog();
      else this.scene.start('main-menu');
    });
    this.refreshHubState();
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    const keyboardUp = Phaser.Input.Keyboard.JustDown(this.navKeys.UP!);
    const keyboardDown = Phaser.Input.Keyboard.JustDown(this.navKeys.DOWN!);
    const keyboardLeft = Phaser.Input.Keyboard.JustDown(this.navKeys.LEFT!);
    const keyboardRight = Phaser.Input.Keyboard.JustDown(this.navKeys.RIGHT!);
    const keyboardConfirm = Phaser.Input.Keyboard.JustDown(this.navKeys.ENTER!) || Phaser.Input.Keyboard.JustDown(this.navKeys.SPACE!);
    const padLeft = Boolean(pad && (pad.left || Number(pad.axes[0]?.value) < -0.5));
    const padRight = Boolean(pad && (pad.right || Number(pad.axes[0]?.value) > 0.5));
    const up = keyboardUp || Boolean(pad && (pad.up || Number(pad.axes[1]?.value) < -0.5));
    const down = keyboardDown || Boolean(pad && (pad.down || Number(pad.axes[1]?.value) > 0.5));
    const confirm = keyboardConfirm || Boolean(pad && (pad.A || pad.buttons[9]?.pressed));
    const back = Boolean(pad && (pad.B || pad.buttons[8]?.pressed));

    if (this.respecDialog) {
      const left = keyboardLeft || padLeft;
      const right = keyboardRight || padRight;
      if ((left && !this.previousPad.left) || (right && !this.previousPad.right)) {
        this.setRespecDialogSelection(left ? 'cancel' : 'confirm');
      }
      if (confirm && !this.previousPad.confirm) this.activateRespecDialogSelection();
      if (back && !this.previousPad.back) this.closeRespecDialog();
      this.previousPad = { up, down, left, right, confirm, back };
      return;
    }

    if (up && !this.previousPad.up) {
      this.selectedIndex = (this.selectedIndex - 1 + UPGRADES.length + 1) % (UPGRADES.length + 1);
      this.highlightSelected();
    }
    if (down && !this.previousPad.down) {
      this.selectedIndex = (this.selectedIndex + 1) % (UPGRADES.length + 1);
      this.highlightSelected();
    }
    if (confirm && !this.previousPad.confirm) {
      if (this.selectedIndex === UPGRADES.length) {
        this.openRespecDialog();
      } else {
        const upgrade = UPGRADES[this.selectedIndex]!;
        const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
        if (saveManager) {
          const currentLevel = saveManager.getPermanentUpgradeLevel(upgrade.id);
          const cost = getPermanentUpgradeCost(upgrade.id, currentLevel);
          if (cost !== null) this.purchaseUpgrade(upgrade.id, cost, upgrade.maxLevel);
        }
      }
    }
    if (back && !this.previousPad.back) {
      this.scene.start('main-menu');
    }

    this.previousPad = { up, down, left: false, right: false, confirm, back };
  }

  private openRespecDialog(): void {
    if (this.respecDialog) return;
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const quote = saveManager?.getPermanentUpgradeRespecQuote();
    if (!quote || quote.totalInvested <= 0) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const dialog = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(centerX, centerY, width, height, 0x050407, 0.84).setInteractive();
    const panel = this.add.rectangle(centerX, centerY, 560, 300, 0x211a23, 1).setStrokeStyle(2, 0xb99a61, 0.9);
    const title = this.add.text(centerX, centerY - 105, 'GELİŞTİRMELERİ YENİDEN DAĞIT', {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f2e8d4', fontStyle: 'bold'
    }).setOrigin(0.5);
    const details = this.add.text(centerX, centerY - 28,
      `Toplam yatırım: ${quote.totalInvested} Ruh Özü\nHizmet bedeli (%10): ${quote.fee} Ruh Özü\nGeri alınacak: ${quote.refund} Ruh Özü\n\nAltı geliştirme seviyen sıfırlanacak. Emin misin?`, {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#c9bdb0', align: 'center', lineSpacing: 8
      }).setOrigin(0.5);
    this.respecDialogStatus = this.add.text(centerX, centerY + 68, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#d18b82', align: 'center'
    }).setOrigin(0.5);

    this.respecCancelBg = this.add.rectangle(centerX - 112, centerY + 112, 180, 46, 0x342d34, 1)
      .setStrokeStyle(1, 0x82747b, 0.8).setInteractive({ useHandCursor: true });
    const cancelText = this.add.text(centerX - 112, centerY + 112, 'VAZGEÇ', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#e4d9cf', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.respecConfirmBg = this.add.rectangle(centerX + 112, centerY + 112, 180, 46, 0x5b3d32, 1)
      .setStrokeStyle(1, 0xb99a61, 0.8).setInteractive({ useHandCursor: true });
    const confirmText = this.add.text(centerX + 112, centerY + 112, 'SIFIRLA', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#f2e8d4', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.respecCancelBg.on('pointerover', () => this.setRespecDialogSelection('cancel'));
    this.respecCancelBg.on('pointerup', () => this.closeRespecDialog());
    this.respecConfirmBg.on('pointerover', () => this.setRespecDialogSelection('confirm'));
    this.respecConfirmBg.on('pointerup', () => this.confirmRespec());
    dialog.add([dim, panel, title, details, this.respecDialogStatus, this.respecCancelBg, cancelText, this.respecConfirmBg, confirmText]);
    this.respecDialog = dialog;
    this.setRespecDialogSelection('cancel');
  }

  private setRespecDialogSelection(selection: 'cancel' | 'confirm'): void {
    this.respecDialogSelection = selection;
    this.respecCancelBg?.setStrokeStyle(selection === 'cancel' ? 3 : 1, selection === 'cancel' ? 0xf2e8d4 : 0x82747b, 1);
    this.respecConfirmBg?.setStrokeStyle(selection === 'confirm' ? 3 : 1, selection === 'confirm' ? 0xf2e8d4 : 0xb99a61, 1);
  }

  private activateRespecDialogSelection(): void {
    if (this.respecDialogSelection === 'confirm') this.confirmRespec();
    else this.closeRespecDialog();
  }

  private confirmRespec(): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (saveManager?.respecPermanentUpgrades()) {
      this.closeRespecDialog();
      this.refreshHubState();
      return;
    }
    this.respecDialogStatus?.setText('Kayıt güncellenemedi. Geliştirmelerin korunuyor.');
  }

  private closeRespecDialog(): void {
    this.respecDialog?.destroy(true);
    this.respecDialog = undefined;
    this.respecDialogStatus = undefined;
    this.respecCancelBg = undefined;
    this.respecConfirmBg = undefined;
    this.respecDialogSelection = 'cancel';
    this.previousPad.left = false;
    this.previousPad.right = false;
    this.previousPad.confirm = false;
    this.previousPad.back = false;
  }

  private highlightSelected(): void {
    UPGRADES.forEach((upgrade, index) => {
      const bg = this.buttonBgs.get(upgrade.id);
      if (bg) {
        const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
        const currentLevel = saveManager ? saveManager.getPermanentUpgradeLevel(upgrade.id) : 0;
        const isMax = currentLevel >= upgrade.maxLevel;
        if (index === this.selectedIndex) {
          bg.setStrokeStyle(2, 0xf2e8d4, 1);
        } else {
          bg.setStrokeStyle(1, 0xb99a61, isMax ? 0.2 : 0.6);
        }
      }
    });
    this.respecButton?.setStyle(this.selectedIndex === UPGRADES.length
      ? { color: '#ffffff', backgroundColor: '#5b3d32' }
      : { color: '#d9c9aa', backgroundColor: '#2b2528' });
  }

  private purchaseUpgrade(upgradeId: string, cost: number, maxLevel: number): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (!saveManager) return;
    const success = saveManager.purchasePermanentUpgrade(upgradeId, cost, maxLevel);
    if (success) this.refreshHubState();
  }

  private refreshHubState(): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager ? saveManager.load() : null;
    const soulEssence = loaded && 'data' in loaded ? loaded.data.progression.soulEssence : 0;
    const quote = saveManager?.getPermanentUpgradeRespecQuote();

    if (this.essenceText) this.essenceText.setText(`Ruh Özü: ${soulEssence}`);
    if (this.respecButton) {
      this.respecButton.setAlpha(quote && quote.totalInvested > 0 ? 1 : 0.45);
    }

    UPGRADES.forEach((upgrade) => {
      const currentLevel = saveManager ? saveManager.getPermanentUpgradeLevel(upgrade.id) : 0;
      const cost = getPermanentUpgradeCost(upgrade.id, currentLevel);
      const isMax = currentLevel >= upgrade.maxLevel;

      const levelText = this.levelTexts.get(upgrade.id);
      if (levelText) levelText.setText(`Seviye ${currentLevel} / ${upgrade.maxLevel}`);

      const costText = this.costTexts.get(upgrade.id);
      if (costText) {
        costText.setText(isMax ? 'MAX' : `${cost ?? ''} Öz`);
        costText.setColor(isMax ? '#888888' : (soulEssence >= (cost ?? Number.POSITIVE_INFINITY) ? '#f0d9b5' : '#d18b82'));
      }

      const btnBg = this.buttonBgs.get(upgrade.id);
      const btnText = this.buttonTexts.get(upgrade.id);
      if (btnBg && btnText) {
        if (isMax) {
          btnBg.setFillStyle(0x2b2528);
          btnText.setText('TAMAMLANDI');
          btnText.setColor('#888888');
          btnBg.disableInteractive();
        } else {
          btnBg.setFillStyle(0x5b3d32);
          btnText.setText('GELİŞTİR');
          btnText.setColor('#f2e8d4');
        }
      }
    });
    this.respecButton?.setStyle(this.selectedIndex === UPGRADES.length
      ? { color: '#ffffff', backgroundColor: '#5b3d32' }
      : { color: '#d9c9aa', backgroundColor: '#2b2528' });
    this.highlightSelected();
  }
}
