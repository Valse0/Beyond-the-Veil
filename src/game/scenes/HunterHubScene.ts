import Phaser from 'phaser';
import type { SaveManager } from '../../systems/save/save-manager.js';

interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

const UPGRADES: UpgradeDefinition[] = [
  { id: 'maxHealth', name: 'Avcının Canı', description: 'Maksimum canı artırır (+15 HP / seviye).', baseCost: 50, maxLevel: 5 },
  { id: 'attackPower', name: 'Saldırı Gücü', description: 'Verilen hasarı artırır (%+5 / seviye).', baseCost: 75, maxLevel: 5 },
  { id: 'moveSpeed', name: 'Hareket Hızı', description: 'Yürüme ve koşu hızını artırır (%+4 / seviye).', baseCost: 60, maxLevel: 5 },
  { id: 'armor', name: 'Zırh ve Direnç', description: 'Gelen hasarı azaltır (+2 / seviye).', baseCost: 70, maxLevel: 5 },
  { id: 'xpBonus', name: 'Ruh Deneyimi', description: 'Kazanılan XP miktarını artırır (%+8 / seviye).', baseCost: 80, maxLevel: 5 },
  { id: 'rerolls', name: 'Kutsal Yenileme', description: 'Seviye atlamada ekstra yenileme hakkı verir (+1 / seviye).', baseCost: 100, maxLevel: 3 }
];

export class HunterHubScene extends Phaser.Scene {
  private essenceText?: Phaser.GameObjects.Text;
  private levelTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private costTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private buttonBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private buttonTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private selectedIndex = 0;
  private previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };

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
      const cost = upgrade.baseCost * (currentLevel + 1);

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

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('main-menu'));
    this.refreshHubState();
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;

    const up = pad.up || Number(pad.axes[1]?.value) < -0.5;
    const down = pad.down || Number(pad.axes[1]?.value) > 0.5;
    const confirm = Boolean(pad.A || pad.buttons[9]?.pressed);
    const back = Boolean(pad.B || pad.buttons[8]?.pressed);

    if (up && !this.previousPad.up) {
      this.selectedIndex = (this.selectedIndex - 1 + UPGRADES.length) % UPGRADES.length;
      this.highlightSelected();
    }
    if (down && !this.previousPad.down) {
      this.selectedIndex = (this.selectedIndex + 1) % UPGRADES.length;
      this.highlightSelected();
    }
    if (confirm && !this.previousPad.confirm) {
      const upgrade = UPGRADES[this.selectedIndex]!;
      const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
      if (saveManager) {
        const currentLevel = saveManager.getPermanentUpgradeLevel(upgrade.id);
        const cost = upgrade.baseCost * (currentLevel + 1);
        if (currentLevel < upgrade.maxLevel) {
          this.purchaseUpgrade(upgrade.id, cost, upgrade.maxLevel);
        }
      }
    }
    if (back && !this.previousPad.back) {
      this.scene.start('main-menu');
    }

    this.previousPad = { up, down, left: false, right: false, confirm, back };
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
  }

  private purchaseUpgrade(upgradeId: string, cost: number, maxLevel: number): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (!saveManager) return;
    const success = saveManager.purchasePermanentUpgrade(upgradeId, cost, maxLevel);
    if (success) {
      this.refreshHubState();
    }
  }

  private refreshHubState(): void {
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager ? saveManager.load() : null;
    const soulEssence = loaded && 'data' in loaded ? loaded.data.progression.soulEssence : 0;

    if (this.essenceText) {
      this.essenceText.setText(`Ruh Özü: ${soulEssence}`);
    }

    UPGRADES.forEach((upgrade) => {
      const currentLevel = saveManager ? saveManager.getPermanentUpgradeLevel(upgrade.id) : 0;
      const cost = upgrade.baseCost * (currentLevel + 1);
      const isMax = currentLevel >= upgrade.maxLevel;

      const levelText = this.levelTexts.get(upgrade.id);
      if (levelText) levelText.setText(`Seviye ${currentLevel} / ${upgrade.maxLevel}`);

      const costText = this.costTexts.get(upgrade.id);
      if (costText) {
        costText.setText(isMax ? 'MAX' : `${cost} Öz`);
        costText.setColor(isMax ? '#888888' : (soulEssence >= cost ? '#f0d9b5' : '#d18b82'));
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
    this.highlightSelected();
  }
}
