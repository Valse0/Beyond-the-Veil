import Phaser from 'phaser';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { PERMANENT_UPGRADES, getPermanentUpgradeCost } from '../../gameplay/progression/permanent-upgrades.js';
import { CRAFTING_MATERIALS, CRAFTING_RECIPES } from '../../data/crafting.js';
import { REGIONS } from '../../data/regions.js';
import { WEAPONS } from '../../data/weapons.js';
import { CHARACTERS } from '../../data/characters.js';
import { PASSIVES } from '../../data/passives.js';
import { RELICS } from '../../data/relics.js';
import type { EquipmentProfile } from '../../gameplay/progression/equipment-profiles.js';

const UPGRADES = PERMANENT_UPGRADES;

export class HunterHubScene extends Phaser.Scene {
  private currentScreen: 'hub' | 'blacksmith' | 'equipment-profiles' | 'equipment-editor' | 'equipment-delete-confirm' = 'hub';
  private essenceText?: Phaser.GameObjects.Text;
  private levelTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private costTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private buttonBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private buttonTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private blacksmithEntryButton?: Phaser.GameObjects.Text;
  private equipmentEntryButton?: Phaser.GameObjects.Text;
  private equipmentCharacterIndex = 0;
  private equipmentSelection = 0;
  private equipmentProfileCount = 0;
  private equipmentSelectedProfileIndex = 0;
  private equipmentProfileRows = new Map<number, Phaser.GameObjects.Rectangle>();
  private equipmentActionButtons = new Map<number, Phaser.GameObjects.Rectangle>();
  private equipmentEditorRows = new Map<number, Phaser.GameObjects.Rectangle>();
  private equipmentEditorSelectedIndex = 0;
  private equipmentEditingProfileId: string | null = null;
  private equipmentDraft: { name: string; startingWeaponId: string; startingPassiveId: string; relicSlots: (string | null)[] } | null = null;
  private equipmentDeleteProfileId: string | null = null;
  private equipmentDeleteSelection: 'cancel' | 'confirm' = 'cancel';
  private equipmentNameInput?: HTMLInputElement;
  private blacksmithRecipeButtons: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private blacksmithRecipeLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private craftableRecipeIds = new Set<string>();
  private blacksmithSelection = 0;
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
    this.navKeys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,ENTER,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.respecDialog) this.closeRespecDialog();
      else if (this.currentScreen === 'equipment-editor') this.renderEquipmentProfiles('Düzenleme iptal edildi.');
      else if (this.currentScreen === 'equipment-delete-confirm') this.renderEquipmentProfiles();
      else if (this.currentScreen === 'equipment-profiles') this.renderHub(UPGRADES.length + 1);
      else if (this.currentScreen === 'blacksmith') this.renderHub(UPGRADES.length);
      else this.scene.start('main-menu');
    });
    this.renderHub();
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

    if (this.currentScreen === 'equipment-profiles') {
      if ((keyboardLeft || padLeft) && !this.previousPad.left) this.changeEquipmentCharacter(-1);
      if ((keyboardRight || padRight) && !this.previousPad.right) this.changeEquipmentCharacter(1);
      if (up && !this.previousPad.up) this.moveEquipmentSelection(-1);
      if (down && !this.previousPad.down) this.moveEquipmentSelection(1);
      if (confirm && !this.previousPad.confirm) this.activateEquipmentSelection();
      if (back && !this.previousPad.back) this.renderHub(UPGRADES.length + 1);
      this.previousPad = { up, down, left: keyboardLeft || padLeft, right: keyboardRight || padRight, confirm, back };
      return;
    }

    if (this.currentScreen === 'equipment-editor') {
      if (up && !this.previousPad.up) this.equipmentEditorSelectedIndex = Math.max(0, this.equipmentEditorSelectedIndex - 1);
      if (down && !this.previousPad.down) this.equipmentEditorSelectedIndex = Math.min(7, this.equipmentEditorSelectedIndex + 1);
      if (this.equipmentEditorSelectedIndex > 0 && this.equipmentEditorSelectedIndex < 6 && (keyboardLeft || padLeft) && !this.previousPad.left) this.cycleEquipmentEditorOption(-1);
      if (this.equipmentEditorSelectedIndex > 0 && this.equipmentEditorSelectedIndex < 6 && (keyboardRight || padRight) && !this.previousPad.right) this.cycleEquipmentEditorOption(1);
      if (confirm && !this.previousPad.confirm) {
        if (this.equipmentEditorSelectedIndex === 0) this.equipmentNameInput?.focus();
        else if (this.equipmentEditorSelectedIndex === 6) this.saveEquipmentEditor();
        else if (this.equipmentEditorSelectedIndex === 7) this.renderEquipmentProfiles('Düzenleme iptal edildi.');
        else this.cycleEquipmentEditorOption(1);
      }
      if (back && !this.previousPad.back) this.renderEquipmentProfiles('Düzenleme iptal edildi.');
      this.highlightEquipmentEditorSelection();
      this.previousPad = { up, down, left: keyboardLeft || padLeft, right: keyboardRight || padRight, confirm, back };
      return;
    }

    if (this.currentScreen === 'equipment-delete-confirm') {
      if (((keyboardLeft || padLeft) && !this.previousPad.left) || ((keyboardRight || padRight) && !this.previousPad.right)) {
        this.equipmentDeleteSelection = (keyboardLeft || padLeft) ? 'cancel' : 'confirm';
        this.highlightEquipmentDeleteSelection();
      }
      if (confirm && !this.previousPad.confirm) this.confirmEquipmentDelete();
      if (back && !this.previousPad.back) this.renderEquipmentProfiles();
      this.previousPad = { up, down, left: keyboardLeft || padLeft, right: keyboardRight || padRight, confirm, back };
      return;
    }

    if (this.currentScreen === 'blacksmith') {
      if (up && !this.previousPad.up) {
        this.blacksmithSelection = (this.blacksmithSelection - 1 + CRAFTING_RECIPES.length + 1) % (CRAFTING_RECIPES.length + 1);
        this.highlightBlacksmithSelection();
      }
      if (down && !this.previousPad.down) {
        this.blacksmithSelection = (this.blacksmithSelection + 1) % (CRAFTING_RECIPES.length + 1);
        this.highlightBlacksmithSelection();
      }
      if (confirm && !this.previousPad.confirm) {
        if (this.blacksmithSelection === CRAFTING_RECIPES.length) this.renderHub(UPGRADES.length);
        else this.craftSelectedRecipe();
      }
      if (back && !this.previousPad.back) this.renderHub(UPGRADES.length);
      this.previousPad = { up, down, left: false, right: false, confirm, back };
      return;
    }

    if (up && !this.previousPad.up) {
      this.selectedIndex = (this.selectedIndex - 1 + UPGRADES.length + 3) % (UPGRADES.length + 3);
      this.highlightSelected();
    }
    if (down && !this.previousPad.down) {
      this.selectedIndex = (this.selectedIndex + 1) % (UPGRADES.length + 3);
      this.highlightSelected();
    }
    if (confirm && !this.previousPad.confirm) {
      if (this.selectedIndex === UPGRADES.length) {
        this.renderBlacksmith();
      } else if (this.selectedIndex === UPGRADES.length + 1) {
        this.renderEquipmentProfiles();
      } else if (this.selectedIndex === UPGRADES.length + 2) {
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
    if (back && !this.previousPad.back) this.scene.start('main-menu');
    this.previousPad = { up, down, left: false, right: false, confirm, back };
  }


  browserTestSnapshot(): {
    screen: 'hub' | 'blacksmith' | 'equipment-profiles' | 'equipment-editor' | 'equipment-delete-confirm';
    selectedIndex: number;
    selectedRecipeId: string | null;
    equipmentCharacterId: string | null;
    equipmentProfileIds: string[];
    activeEquipmentProfileId: string | null;
    equipmentSelection: number;
    equipmentEditorSelectedIndex: number;
    recipeIds: string[];
    craftableRecipeIds: string[];
  } {
    return {
      screen: this.currentScreen,
      selectedIndex: this.selectedIndex,
      equipmentCharacterId: this.getSelectedEquipmentCharacter()?.id ?? null,
      equipmentProfileIds: this.getSelectedEquipmentCharacter() ? (this.registry.get('saveManager') as SaveManager | undefined)?.getEquipmentProfiles(this.getSelectedEquipmentCharacter()!.id).map(profile => profile.id) ?? [] : [],
      activeEquipmentProfileId: this.getSelectedEquipmentCharacter() ? (this.registry.get('saveManager') as SaveManager | undefined)?.getActiveEquipmentProfile(this.getSelectedEquipmentCharacter()!.id)?.id ?? null : null,
      equipmentSelection: this.equipmentSelection,
      equipmentEditorSelectedIndex: this.equipmentEditorSelectedIndex,
      selectedRecipeId: CRAFTING_RECIPES[this.blacksmithSelection]?.id ?? null,
      recipeIds: CRAFTING_RECIPES.map(recipe => recipe.id),
      craftableRecipeIds: [...this.craftableRecipeIds]
    };
  }

  private drawBackdrop(width: number, height: number): void {
    this.cameras.main.setBackgroundColor('#0b0b10');
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x17131c, 1);
    backdrop.fillCircle(width * 0.5, height * 0.4, 380);
    backdrop.lineStyle(1, 0xb99a61, 0.25);
    backdrop.strokeCircle(width * 0.5, height * 0.4, 340);
  }

  private renderHub(selectedIndex = 0): void {
    this.removeEquipmentNameInput();
    this.children.removeAll(true);
    this.currentScreen = 'hub';
    this.selectedIndex = selectedIndex;
    this.levelTexts.clear();
    this.costTexts.clear();
    this.buttonBgs.clear();
    this.buttonTexts.clear();
    this.blacksmithRecipeButtons.clear();
    this.blacksmithRecipeLabels.clear();
    this.craftableRecipeIds.clear();
    this.essenceText = undefined;
    this.blacksmithEntryButton = undefined;
    this.equipmentEntryButton = undefined;
    this.respecButton = undefined;
    this.respecDialog = undefined;
    this.respecDialogStatus = undefined;
    this.respecCancelBg = undefined;
    this.respecConfirmBg = undefined;
    this.respecDialogSelection = 'cancel';
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };

    const width = this.scale.width;
    const height = this.scale.height;
    this.drawBackdrop(width, height);

    this.add.text(64, 42, 'AVCI KARARGAHI', {
      fontFamily: 'Georgia, serif', fontSize: '36px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 88, 'Topladığın Ruh Özü ile kalıcı mühürleri ve avcı yeteneklerini geliştir.', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#b8aaa0'
    });

    this.navKeys = this.navKeys ?? this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,ENTER,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
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

    this.blacksmithEntryButton = this.add.text(width - 64, 114, '⚒ DEMİRCİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#d9c9aa',
      backgroundColor: '#2b2528', padding: { x: 18, y: 10 }
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.blacksmithEntryButton.on('pointerover', () => { this.selectedIndex = UPGRADES.length; this.highlightSelected(); });
    this.blacksmithEntryButton.on('pointerout', () => this.highlightSelected());
    this.blacksmithEntryButton.on('pointerup', () => this.renderBlacksmith());

    this.equipmentEntryButton = this.add.text(width - 250, 114, '⚔ DİZİLİMLER', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#d9c9aa',
      backgroundColor: '#2b2528', padding: { x: 18, y: 10 }
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.equipmentEntryButton.on('pointerover', () => { this.selectedIndex = UPGRADES.length + 1; this.highlightSelected(); });
    this.equipmentEntryButton.on('pointerout', () => this.highlightSelected());
    this.equipmentEntryButton.on('pointerup', () => this.renderEquipmentProfiles());

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
    this.respecButton.on('pointerover', () => { this.selectedIndex = UPGRADES.length + 2; this.highlightSelected(); });
    this.respecButton.on('pointerout', () => this.highlightSelected());
    this.respecButton.on('pointerup', () => this.openRespecDialog());

    this.refreshHubState();
  }

  private renderBlacksmith(statusMessage = '', selectedIndex = 0): void {
    this.removeEquipmentNameInput();
    this.children.removeAll(true);
    this.currentScreen = 'blacksmith';
    this.blacksmithSelection = Math.max(0, Math.min(CRAFTING_RECIPES.length, selectedIndex));
    this.blacksmithRecipeButtons.clear();
    this.blacksmithRecipeLabels.clear();
    this.craftableRecipeIds.clear();
    this.essenceText = undefined;
    this.blacksmithEntryButton = undefined;
    this.respecButton = undefined;
    this.respecDialog = undefined;
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };

    const width = this.scale.width;
    const height = this.scale.height;
    this.drawBackdrop(width, height);
    this.add.text(64, 36, 'DEMİRCİ', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 80, 'Bölgesel malzemeleri kullanarak silahlarının kalıcı Yayılım varyantlarını döv.', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#b8aaa0'
    });

    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager?.load();
    const data = loaded && 'data' in loaded ? loaded.data : null;
    const soulEssence = data?.progression.soulEssence ?? 0;
    this.essenceText = this.add.text(width - 64, 48, `Ruh Özü: ${soulEssence}`, {
      fontFamily: 'Georgia, serif', fontSize: '21px', color: '#f0d9b5', fontStyle: 'bold'
    }).setOrigin(1, 0);

    const leftX = 48;
    const cardWidth = width - 96;
    const cardHeight = 82;
    const gap = 8;
    const startY = 130;

    CRAFTING_RECIPES.forEach((recipe, index) => {
      const y = startY + index * (cardHeight + gap);
      const weapon = WEAPONS.find(item => item.id === recipe.weaponId);
      const region = REGIONS.find(item => item.id === recipe.regionId);
      const crafted = Boolean(data?.collections.unlockedWeaponVariantIds.includes(recipe.unlockWeaponVariantId));
      const materialLines = Object.entries(recipe.materialCosts).map(([materialId, amount]) => {
        const material = CRAFTING_MATERIALS.find(item => item.id === materialId);
        const owned = data?.collections.craftingMaterials[materialId] ?? 0;
        return { text: `${material?.name ?? materialId}: ${amount} (sende ${owned})`, enough: owned >= amount };
      });
      const enoughMaterials = materialLines.every(item => item.enough);
      const enoughEssence = soulEssence >= recipe.soulEssenceCost;
      const canCraft = Boolean(saveManager && data && !crafted && enoughMaterials && enoughEssence);

      this.add.rectangle(leftX + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight, 0x1d1720, 0.94)
        .setStrokeStyle(1, 0xb99a61, crafted ? 0.25 : 0.48);
      this.add.text(leftX + 20, y + 9, recipe.name, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2e8d4', fontStyle: 'bold'
      });
      this.add.text(leftX + 20, y + 32, `${weapon?.name ?? recipe.weaponId}  •  ${region?.name ?? recipe.regionId}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#d0bd9f'
      });
      this.add.text(leftX + 20, y + 53, recipe.description, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#9f9690'
      });

      this.add.text(width - 365, y + 15, `Ruh Özü: ${recipe.soulEssenceCost} / ${soulEssence}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: enoughEssence ? '#d9c9aa' : '#d18b82'
      });
      this.add.text(width - 365, y + 43, materialLines.map(item => item.text).join('  •  '), {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: enoughMaterials ? '#d9c9aa' : '#d18b82'
      });

      const buttonLabel = crafted ? 'AÇILDI' : canCraft ? 'ÜRET' : !enoughEssence ? 'EKSİK ÖZ' : 'EKSİK MALZEME';
      const buttonBg = this.add.rectangle(width - 122, y + cardHeight / 2, 124, 38, canCraft ? 0x5b3d32 : 0x2b2528, 1)
        .setStrokeStyle(1, 0xb99a61, canCraft ? 0.7 : 0.22);
      const buttonText = this.add.text(width - 122, y + cardHeight / 2, buttonLabel, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: canCraft ? '#f2e8d4' : '#88817f', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.blacksmithRecipeButtons.set(recipe.id, buttonBg);
      this.blacksmithRecipeLabels.set(recipe.id, buttonText);
      if (canCraft) {
        this.craftableRecipeIds.add(recipe.id);
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.on('pointerover', () => { this.blacksmithSelection = index; this.highlightBlacksmithSelection(); });
        buttonBg.on('pointerout', () => this.highlightBlacksmithSelection());
        buttonBg.on('pointerup', () => { this.blacksmithSelection = index; this.craftSelectedRecipe(); });
      }
    });

    this.add.text(width / 2, height - 88, statusMessage, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#d9c9aa', align: 'center'
    }).setOrigin(0.5);
    const backButton = this.add.text(64, height - 54, '← KARARGAHA DÖN', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#d9c9aa',
      backgroundColor: '#2b2528', padding: { x: 18, y: 10 }
    }).setInteractive({ useHandCursor: true });
    backButton.on('pointerover', () => { this.blacksmithSelection = CRAFTING_RECIPES.length; this.highlightBlacksmithSelection(); });
    backButton.on('pointerout', () => this.highlightBlacksmithSelection());
    backButton.on('pointerup', () => this.renderHub(UPGRADES.length));
    this.add.text(width - 64, height - 48, '↑ / ↓ SEÇ   •   ENTER / A ÜRET   •   ESC / B GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#77727a'
    }).setOrigin(1, 0.5);
    this.highlightBlacksmithSelection();
  }

  private highlightBlacksmithSelection(): void {
    CRAFTING_RECIPES.forEach((recipe, index) => {
      const bg = this.blacksmithRecipeButtons.get(recipe.id);
      const label = this.blacksmithRecipeLabels.get(recipe.id);
      if (!bg || !label) return;
      const selected = index === this.blacksmithSelection;
      bg.setStrokeStyle(selected ? 2 : 1, selected ? 0xf2e8d4 : 0xb99a61, selected ? 1 : 0.48);
      if (bg.input?.enabled) bg.setFillStyle(selected ? 0x79513c : 0x5b3d32);
    });
  }

  private craftSelectedRecipe(): void {
    const recipe = CRAFTING_RECIPES[this.blacksmithSelection];
    if (!recipe) return;
    if (!this.craftableRecipeIds.has(recipe.id)) return;
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (saveManager?.craftRecipe(recipe.id)) {
      const weapon = WEAPONS.find(item => item.id === recipe.weaponId);
      this.renderBlacksmith(`${recipe.name} üretildi. ${weapon?.name ?? 'Silah'} varyantı kalıcı olarak açıldı.`, this.blacksmithSelection);
      return;
    }
    this.renderBlacksmith('Üretim yapılamadı. Kaynakların ve kayıt dosyan korunuyor.', this.blacksmithSelection);
  }

  private getUnlockedEquipmentCharacters(): (typeof CHARACTERS)[number][] {
    const loaded = (this.registry.get('saveManager') as SaveManager | undefined)?.load();
    if (!loaded || !('data' in loaded)) return [];
    return CHARACTERS.filter(character => loaded.data.progression.unlockedCharacterIds.includes(character.id));
  }

  private getSelectedEquipmentCharacter(): typeof CHARACTERS[number] | undefined {
    const characters = this.getUnlockedEquipmentCharacters();
    if (characters.length === 0) return undefined;
    this.equipmentCharacterIndex = Phaser.Math.Clamp(this.equipmentCharacterIndex, 0, characters.length - 1);
    return characters[this.equipmentCharacterIndex];
  }

  private changeEquipmentCharacter(direction: number): void {
    const characters = this.getUnlockedEquipmentCharacters();
    if (characters.length < 2) return;
    this.equipmentCharacterIndex = (this.equipmentCharacterIndex + direction + characters.length) % characters.length;
    this.equipmentSelection = 0;
    this.equipmentSelectedProfileIndex = 0;
    this.renderEquipmentProfiles();
  }

  private renderEquipmentProfiles(statusMessage = ''): void {
    this.removeEquipmentNameInput();
    this.children.removeAll(true);
    this.currentScreen = 'equipment-profiles';
    this.equipmentProfileRows.clear();
    this.equipmentActionButtons.clear();
    this.equipmentEditorRows.clear();
    this.equipmentDraft = null;
    this.equipmentEditingProfileId = null;
    this.equipmentDeleteProfileId = null;
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };
    const width = this.scale.width;
    const height = this.scale.height;
    this.drawBackdrop(width, height);
    this.add.text(64, 34, 'EKİPMAN DİZİLİMLERİ', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 76, 'Her avcı için beş adede kadar başlangıç yüklemesi kaydet.', {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#b8aaa0'
    });
    const characters = this.getUnlockedEquipmentCharacters();
    if (characters.length === 0) {
      this.add.text(width / 2, height / 2, 'Açık avcı bulunamadı.', {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#d18b82'
      }).setOrigin(0.5);
      this.add.text(64, height - 56, '← KARARGAHA DÖN', {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#d9c9aa',
        backgroundColor: '#2b2528', padding: { x: 16, y: 10 }
      }).setInteractive().on('pointerup', () => this.renderHub(UPGRADES.length + 1));
      return;
    }
    this.equipmentCharacterIndex = Phaser.Math.Clamp(this.equipmentCharacterIndex, 0, characters.length - 1);
    const character = characters[this.equipmentCharacterIndex]!;
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const profiles = saveManager?.getEquipmentProfiles(character.id) ?? [];
    const activeProfileId = saveManager?.getActiveEquipmentProfile(character.id)?.id ?? null;
    this.equipmentProfileCount = profiles.length;
    this.equipmentSelection = Phaser.Math.Clamp(this.equipmentSelection, 0, Math.max(0, profiles.length + 4));
    this.equipmentSelectedProfileIndex = Phaser.Math.Clamp(this.equipmentSelectedProfileIndex, 0, Math.max(0, profiles.length - 1));

    const previous = this.add.text(340, 116, '◀', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#e9dfcb',
      backgroundColor: '#2b2528', padding: { x: 12, y: 6 }
    }).setInteractive({ useHandCursor: true });
    previous.on('pointerup', () => this.changeEquipmentCharacter(-1));
    this.add.text(width / 2, 118, character.name + '  •  ' + (this.equipmentCharacterIndex + 1) + '/' + characters.length, {
      fontFamily: 'Georgia, serif', fontSize: '20px', color: '#f0d9b5', fontStyle: 'bold'
    }).setOrigin(0.5);
    const next = this.add.text(910, 116, '▶', {
      fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#e9dfcb',
      backgroundColor: '#2b2528', padding: { x: 12, y: 6 }
    }).setInteractive({ useHandCursor: true });
    next.on('pointerup', () => this.changeEquipmentCharacter(1));

    if (profiles.length === 0) {
      this.add.text(width / 2, 300, 'Henüz kayıtlı dizilim yok.\nİlk dizilimini oluşturarak koşuya özel başlangıç ekipmanını belirle.', {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#b8aaa0', align: 'center', lineSpacing: 10
      }).setOrigin(0.5);
    }
    profiles.forEach((profile, index) => {
      const y = 164 + index * 70;
      const isActive = profile.id === activeProfileId;
      const bg = this.add.rectangle(width / 2, y + 27, width - 128, 58, 0x1d1720, 0.96)
        .setStrokeStyle(1, isActive ? 0xc6a66d : 0xb99a61, isActive ? 0.8 : 0.35)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { this.equipmentSelection = index; this.equipmentSelectedProfileIndex = index; this.highlightEquipmentSelection(); });
      bg.on('pointerup', () => { this.equipmentSelection = index; this.equipmentSelectedProfileIndex = index; this.highlightEquipmentSelection(); });
      this.equipmentProfileRows.set(index, bg);
      const weapon = WEAPONS.find(item => item.id === profile.startingWeaponId)?.name ?? profile.startingWeaponId;
      const passive = PASSIVES.find(item => item.id === profile.startingPassiveId)?.name ?? profile.startingPassiveId;
      const relicNames = profile.relicIds.map(id => RELICS.find(relic => relic.id === id)?.name ?? id);
      this.add.text(92, y + 8, profile.name + (isActive ? '  •  ETKİN' : ''), {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: isActive ? '#f0d9b5' : '#f2e8d4', fontStyle: 'bold'
      });
      this.add.text(92, y + 32, 'Silah: ' + weapon + '   •   Pasif: ' + passive + '   •   Yadigâr: ' + (relicNames.join(', ') || 'Yok'), {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#aaa09a'
      });
    });
    const actions = [
      { label: '＋ YENİ', enabled: profiles.length < 5, run: () => this.openEquipmentEditor() },
      { label: 'ETKİNLEŞTİR', enabled: profiles.length > 0, run: () => this.activateSelectedEquipmentProfile() },
      { label: 'DÜZENLE', enabled: profiles.length > 0, run: () => this.editSelectedEquipmentProfile() },
      { label: 'SİL', enabled: profiles.length > 0, run: () => this.openEquipmentDeleteConfirm() },
      { label: 'GERİ', enabled: true, run: () => this.renderHub(UPGRADES.length + 1) }
    ];
    const buttonWidth = 190;
    const gap = 38;
    const totalWidth = actions.length * buttonWidth + (actions.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    actions.forEach((action, index) => {
      const x = startX + index * (buttonWidth + gap);
      const button = this.add.rectangle(x, height - 76, buttonWidth, 46, action.enabled ? 0x3b2c2d : 0x252126, 1)
        .setStrokeStyle(1, 0xb99a61, action.enabled ? 0.65 : 0.2);
      this.add.text(x, height - 76, action.label, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: action.enabled ? '#f2e8d4' : '#77727a', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(1);
      this.equipmentActionButtons.set(profiles.length + index, button);
      if (action.enabled) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerover', () => { this.equipmentSelection = profiles.length + index; this.highlightEquipmentSelection(); });
        button.on('pointerup', action.run);
      }
    });
    this.add.text(width / 2, height - 126, statusMessage || ('Dizilim: ' + profiles.length + '/5   •   ← / → Avcı   •   ↑ / ↓ Seç   •   ENTER Onayla'), {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#aaa09a', align: 'center'
    }).setOrigin(0.5);
    this.highlightEquipmentSelection();
  }

  private highlightEquipmentSelection(): void {
    this.equipmentProfileRows.forEach((bg, index) => {
      const selected = index === this.equipmentSelection;
      bg.setStrokeStyle(selected ? 3 : 1, selected ? 0xf2e8d4 : 0xb99a61, selected ? 1 : 0.35);
    });
    this.equipmentActionButtons.forEach((bg, index) => {
      const selected = index === this.equipmentSelection;
      bg.setStrokeStyle(selected ? 3 : 1, selected ? 0xf2e8d4 : 0xb99a61, selected ? 1 : 0.65);
    });
  }

  private moveEquipmentSelection(direction: number): void {
    const total = this.equipmentProfileCount + 5;
    this.equipmentSelection = (this.equipmentSelection + direction + total) % total;
    if (this.equipmentSelection < this.equipmentProfileCount) this.equipmentSelectedProfileIndex = this.equipmentSelection;
    this.highlightEquipmentSelection();
  }

  private activateEquipmentSelection(): void {
    if (this.equipmentSelection < this.equipmentProfileCount) {
      this.equipmentSelectedProfileIndex = this.equipmentSelection;
      this.highlightEquipmentSelection();
      return;
    }
    const actionIndex = this.equipmentSelection - this.equipmentProfileCount;
    if (actionIndex === 0) this.openEquipmentEditor();
    else if (actionIndex === 1) this.activateSelectedEquipmentProfile();
    else if (actionIndex === 2) this.editSelectedEquipmentProfile();
    else if (actionIndex === 3) this.openEquipmentDeleteConfirm();
    else if (actionIndex === 4) this.renderHub(UPGRADES.length + 1);
  }

  private activateSelectedEquipmentProfile(): void {
    const character = this.getSelectedEquipmentCharacter();
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const profile = character ? saveManager?.getEquipmentProfiles(character.id)[this.equipmentSelectedProfileIndex] : undefined;
    if (!character || !profile) return;
    if (saveManager?.activateEquipmentProfile(character.id, profile.id)) {
      this.equipmentSelection = this.equipmentSelectedProfileIndex;
      this.renderEquipmentProfiles(profile.name + ' etkinleştirildi. Sonraki koşuda uygulanacak.');
    } else this.renderEquipmentProfiles('Dizilim etkinleştirilemedi; kayıt korunuyor.');
  }

  private editSelectedEquipmentProfile(): void {
    const character = this.getSelectedEquipmentCharacter();
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const profile = character ? saveManager?.getEquipmentProfiles(character.id)[this.equipmentSelectedProfileIndex] : undefined;
    if (profile) this.openEquipmentEditor(profile);
  }

  private openEquipmentEditor(profile?: EquipmentProfile): void {
    const character = this.getSelectedEquipmentCharacter();
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (!character || !saveManager) return;
    const count = saveManager.getEquipmentProfiles(character.id).length;
    if (!profile && count >= 5) return;
    this.equipmentEditingProfileId = profile?.id ?? null;
    this.equipmentDraft = {
      name: profile?.name ?? ('Dizilim ' + (count + 1)),
      startingWeaponId: profile?.startingWeaponId ?? character.startingWeaponId,
      startingPassiveId: profile?.startingPassiveId ?? character.startingPassiveId,
      relicSlots: [profile?.relicIds[0] ?? null, profile?.relicIds[1] ?? null, profile?.relicIds[2] ?? null]
    };
    this.equipmentEditorSelectedIndex = 0;
    this.renderEquipmentEditor();
  }

  private renderEquipmentEditor(statusMessage = ''): void {
    this.removeEquipmentNameInput();
    this.children.removeAll(true);
    this.currentScreen = 'equipment-editor';
    this.equipmentEditorRows.clear();
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };
    const draft = this.equipmentDraft;
    const character = this.getSelectedEquipmentCharacter();
    if (!draft || !character) {
      this.renderEquipmentProfiles('Dizilim düzenleyicisi açılamadı.');
      return;
    }
    const width = this.scale.width;
    const height = this.scale.height;
    this.drawBackdrop(width, height);
    this.add.text(64, 34, this.equipmentEditingProfileId ? 'DİZİLİMİ DÜZENLE' : 'YENİ DİZİLİM', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(67, 76, character.name + '  •  İsim, başlangıç silahı, pasif ve en fazla üç sahip olunan yadigâr', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#b8aaa0'
    });
    const loaded = (this.registry.get('saveManager') as SaveManager | undefined)?.load();
    const ownedRelicIds = loaded && 'data' in loaded ? loaded.data.collections.relicIds : [];
    const values = [
      draft.name || 'İsimsiz dizilim',
      WEAPONS.find(item => item.id === draft.startingWeaponId)?.name ?? draft.startingWeaponId,
      PASSIVES.find(item => item.id === draft.startingPassiveId)?.name ?? draft.startingPassiveId,
      ...draft.relicSlots.map(id => id ? (RELICS.find(relic => relic.id === id)?.name ?? id) : 'Yok')
    ];
    const labels = ['İSİM', 'BAŞLANGIÇ SİLAHI', 'BAŞLANGIÇ PASİFİ', 'YADİGÂR 1', 'YADİGÂR 2', 'YADİGÂR 3'];
    labels.forEach((label, index) => {
      const y = 138 + index * 62;
      const selected = this.equipmentEditorSelectedIndex === index;
      const bg = this.add.rectangle(width / 2, y + 22, width - 128, 52, 0x1d1720, 0.96)
        .setStrokeStyle(selected ? 3 : 1, selected ? 0xf2e8d4 : 0xb99a61, selected ? 1 : 0.35)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { this.equipmentEditorSelectedIndex = index; this.highlightEquipmentEditorSelection(); });
      bg.on('pointerup', () => {
        this.equipmentEditorSelectedIndex = index;
        if (index > 0) this.cycleEquipmentEditorOption(1);
        else this.highlightEquipmentEditorSelection();
      });
      this.equipmentEditorRows.set(index, bg);
      this.add.text(92, y + 7, label, {
        fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#a89c96', fontStyle: 'bold'
      });
      if (index > 0) this.add.text(width - 92, y + 26, values[index] + '  ◀  ▶', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#f2e8d4'
      }).setOrigin(1, 0.5);
    });
    const canvasRect = this.game.canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / width;
    const scaleY = canvasRect.height / height;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = draft.name;
    nameInput.maxLength = 28;
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;
    nameInput.setAttribute('aria-label', 'Dizilim adı');
    Object.assign(nameInput.style, {
      position: 'fixed',
      left: (canvasRect.left + 360 * scaleX) + 'px',
      top: (canvasRect.top + 145 * scaleY) + 'px',
      width: ((width - 460) * scaleX) + 'px',
      height: Math.max(32, 38 * scaleY) + 'px',
      boxSizing: 'border-box',
      padding: '6px 12px',
      border: '1px solid #b99a61',
      borderRadius: '4px',
      background: '#241e26',
      color: '#f2e8d4',
      fontFamily: 'Georgia, serif',
      fontSize: Math.max(13, 16 * scaleY) + 'px',
      outline: 'none',
      zIndex: '10000'
    });
    nameInput.addEventListener('input', () => {
      if (this.equipmentDraft) this.equipmentDraft.name = nameInput.value;
    });
    document.body.appendChild(nameInput);
    this.equipmentNameInput = nameInput;
    this.add.text(width / 2, 530, 'Sahip olunan yadigâr: ' + ownedRelicIds.length + '   •   ' + (statusMessage || 'İsim alanında yazabilir; oklarla seçenekleri değiştirebilirsin.'), {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#aaa09a', align: 'center'
    }).setOrigin(0.5);
    const save = this.add.rectangle(width / 2 - 112, 600, 190, 48, 0x5b3d32, 1).setStrokeStyle(1, 0xb99a61, 0.8).setInteractive({ useHandCursor: true });
    const cancel = this.add.rectangle(width / 2 + 112, 600, 190, 48, 0x302a31, 1).setStrokeStyle(1, 0x82747b, 0.8).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 - 112, 600, 'KAYDET', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f2e8d4', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2 + 112, 600, 'VAZGEÇ', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e4d9cf' }).setOrigin(0.5);
    this.equipmentEditorRows.set(6, save);
    this.equipmentEditorRows.set(7, cancel);
    save.on('pointerover', () => { this.equipmentEditorSelectedIndex = 6; this.highlightEquipmentEditorSelection(); });
    save.on('pointerup', () => this.saveEquipmentEditor());
    cancel.on('pointerover', () => { this.equipmentEditorSelectedIndex = 7; this.highlightEquipmentEditorSelection(); });
    cancel.on('pointerup', () => this.renderEquipmentProfiles('Düzenleme iptal edildi.'));
    this.highlightEquipmentEditorSelection();
  }

  private highlightEquipmentEditorSelection(): void {
    this.equipmentEditorRows.forEach((bg, index) => {
      const selected = index === this.equipmentEditorSelectedIndex;
      bg.setStrokeStyle(selected ? 3 : 1, selected ? 0xf2e8d4 : 0xb99a61, selected ? 1 : 0.45);
    });
  }

  private cycleEquipmentEditorOption(direction: number): void {
    const draft = this.equipmentDraft;
    if (!draft) return;
    const index = this.equipmentEditorSelectedIndex;
    if (index === 1) {
      const current = Math.max(0, WEAPONS.findIndex(item => item.id === draft.startingWeaponId));
      draft.startingWeaponId = WEAPONS[(current + direction + WEAPONS.length) % WEAPONS.length]!.id;
    } else if (index === 2) {
      const current = Math.max(0, PASSIVES.findIndex(item => item.id === draft.startingPassiveId));
      draft.startingPassiveId = PASSIVES[(current + direction + PASSIVES.length) % PASSIVES.length]!.id;
    } else if (index >= 3 && index <= 5) {
      const slot = index - 3;
      const loaded = (this.registry.get('saveManager') as SaveManager | undefined)?.load();
      const owned = loaded && 'data' in loaded ? loaded.data.collections.relicIds : [];
      const usedElsewhere = new Set(draft.relicSlots.filter((id, slotIndex) => id && slotIndex !== slot));
      const options: (string | null)[] = [null, ...owned.filter(id => !usedElsewhere.has(id))];
      const current = options.indexOf(draft.relicSlots[slot] ?? null);
      draft.relicSlots[slot] = options[(Math.max(0, current) + direction + options.length) % options.length] ?? null;
    }
    this.renderEquipmentEditor();
  }

  private saveEquipmentEditor(): void {
    const character = this.getSelectedEquipmentCharacter();
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const draft = this.equipmentDraft;
    if (!character || !saveManager || !draft) return;
    const profileDraft = {
      name: draft.name.trim(),
      startingWeaponId: draft.startingWeaponId,
      startingPassiveId: draft.startingPassiveId,
      relicIds: draft.relicSlots.filter((id): id is string => Boolean(id))
    };
    const success = this.equipmentEditingProfileId
      ? saveManager.updateEquipmentProfile(character.id, this.equipmentEditingProfileId, profileDraft)
      : saveManager.createEquipmentProfile(character.id, profileDraft);
    if (!success) {
      this.renderEquipmentEditor('Kaydedilemedi: isim benzersiz olmalı ve 28 karakteri aşmamalı; yadigârlar sahip olunanlardan seçilmeli.');
      return;
    }
    this.equipmentSelection = 0;
    this.equipmentSelectedProfileIndex = 0;
    this.renderEquipmentProfiles('Dizilim kaydedildi.');
  }

  private removeEquipmentNameInput(): void {
    this.equipmentNameInput?.remove();
    this.equipmentNameInput = undefined;
  }


  private openEquipmentDeleteConfirm(): void {
    const character = this.getSelectedEquipmentCharacter();
    const profile = character ? (this.registry.get('saveManager') as SaveManager | undefined)?.getEquipmentProfiles(character.id)[this.equipmentSelectedProfileIndex] : undefined;
    if (!character || !profile) return;
    this.equipmentDeleteProfileId = profile.id;
    this.equipmentDeleteSelection = 'cancel';
    this.renderEquipmentDeleteConfirm(profile);
  }

  private renderEquipmentDeleteConfirm(profile: EquipmentProfile): void {
    this.removeEquipmentNameInput();
    this.equipmentActionButtons.clear();
    this.children.removeAll(true);
    this.currentScreen = 'equipment-delete-confirm';
    this.previousPad = { up: false, down: false, left: false, right: false, confirm: false, back: false };
    const width = this.scale.width;
    const height = this.scale.height;
    this.drawBackdrop(width, height);
    this.add.text(width / 2, height / 2 - 92, 'DİZİLİM SİLİNSİN Mİ?', {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#e9dfcb', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 20, profile.name + '\nBu işlem yalnızca kayıtlı dizilimi siler.', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#c9bdb0', align: 'center', lineSpacing: 8
    }).setOrigin(0.5);
    const cancel = this.add.rectangle(width / 2 - 112, height / 2 + 100, 190, 48, 0x302a31, 1).setStrokeStyle(1, 0x82747b, 0.8).setInteractive({ useHandCursor: true });
    const confirm = this.add.rectangle(width / 2 + 112, height / 2 + 100, 190, 48, 0x5b3432, 1).setStrokeStyle(1, 0xb77c72, 0.8).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 - 112, height / 2 + 100, 'VAZGEÇ', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e4d9cf' }).setOrigin(0.5);
    this.add.text(width / 2 + 112, height / 2 + 100, 'SİL', { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#f2e8d4', fontStyle: 'bold' }).setOrigin(0.5);
    cancel.on('pointerover', () => { this.equipmentDeleteSelection = 'cancel'; this.highlightEquipmentDeleteSelection(); });
    cancel.on('pointerup', () => this.renderEquipmentProfiles());
    confirm.on('pointerover', () => { this.equipmentDeleteSelection = 'confirm'; this.highlightEquipmentDeleteSelection(); });
    confirm.on('pointerup', () => this.confirmEquipmentDelete());
    this.equipmentActionButtons.set(0, cancel);
    this.equipmentActionButtons.set(1, confirm);
    this.highlightEquipmentDeleteSelection();
  }

  private highlightEquipmentDeleteSelection(): void {
    this.equipmentActionButtons.get(0)?.setStrokeStyle(this.equipmentDeleteSelection === 'cancel' ? 3 : 1, this.equipmentDeleteSelection === 'cancel' ? 0xf2e8d4 : 0x82747b, 1);
    this.equipmentActionButtons.get(1)?.setStrokeStyle(this.equipmentDeleteSelection === 'confirm' ? 3 : 1, this.equipmentDeleteSelection === 'confirm' ? 0xf2e8d4 : 0xb77c72, 1);
  }

  private confirmEquipmentDelete(): void {
    const character = this.getSelectedEquipmentCharacter();
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    if (!character || !saveManager || !this.equipmentDeleteProfileId) return;
    if (saveManager.deleteEquipmentProfile(character.id, this.equipmentDeleteProfileId)) {
      this.equipmentSelectedProfileIndex = 0;
      this.equipmentSelection = 0;
      this.renderEquipmentProfiles('Dizilim silindi. Etkin dizilim silindiyse varsayılan yükleme kullanılır.');
    } else this.renderEquipmentProfiles('Dizilim silinemedi; kayıt korunuyor.');
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
        bg.setStrokeStyle(index === this.selectedIndex ? 2 : 1, index === this.selectedIndex ? 0xf2e8d4 : 0xb99a61, index === this.selectedIndex ? 1 : (isMax ? 0.2 : 0.6));
      }
    });
    this.blacksmithEntryButton?.setStyle(this.selectedIndex === UPGRADES.length
      ? { color: '#ffffff', backgroundColor: '#5b3d32', fontStyle: 'bold' }
      : { color: '#d9c9aa', backgroundColor: '#2b2528', fontStyle: 'normal' });
    this.equipmentEntryButton?.setStyle(this.selectedIndex === UPGRADES.length + 1
      ? { color: '#ffffff', backgroundColor: '#5b3d32' }
      : { color: '#d9c9aa', backgroundColor: '#2b2528' });
    this.respecButton?.setStyle(this.selectedIndex === UPGRADES.length + 2
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
    if (this.currentScreen !== 'hub') return;
    const saveManager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = saveManager ? saveManager.load() : null;
    const soulEssence = loaded && 'data' in loaded ? loaded.data.progression.soulEssence : 0;
    const quote = saveManager?.getPermanentUpgradeRespecQuote();

    if (this.essenceText) this.essenceText.setText(`Ruh Özü: ${soulEssence}`);
    if (this.respecButton) this.respecButton.setAlpha(quote && quote.totalInvested > 0 ? 1 : 0.45);

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
    this.highlightSelected();
  }
}
