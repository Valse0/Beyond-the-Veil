import Phaser from 'phaser';
import { drawUiBackdrop } from '../ui/dark-fantasy-theme.js';
import { buildCollectionArchiveSnapshot, type CollectionArchiveCategory, type CollectionArchiveSnapshot } from '../../gameplay/collections/collection-archive-runtime.js';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { resolveRemoteAction } from '../input/platform-input.js';

const PAGE_SIZE = 8;

export class CollectionArchiveScene extends Phaser.Scene {
  private snapshot: CollectionArchiveSnapshot = { categories: [], discovered: 0, total: 0, completedCategories: 0, grandRewardUnlocked: false };
  private categoryIndex = 0;
  private itemIndex = 0;
  private touchLayout = false;
  private previousPad = { left: false, right: false, up: false, down: false, back: false };

  constructor() { super('collection-archive'); }

  create(): void {
    this.touchLayout = this.sys.game.device.input.touch;
    this.refreshSnapshot();
    this.render();
    this.input.keyboard?.on('keydown-LEFT', () => this.moveCategory(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveCategory(1));
    this.input.keyboard?.on('keydown-UP', () => this.moveItem(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveItem(1));
    this.input.keyboard?.on('keydown-ESC', this.closeArchive, this);
    this.input.keyboard?.on('keydown-BACKSPACE', this.closeArchive, this);
    this.input.keyboard?.on('keydown', this.handleRemoteKey, this);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ESC', this.closeArchive, this);
      this.input.keyboard?.off('keydown-BACKSPACE', this.closeArchive, this);
      this.input.keyboard?.off('keydown', this.handleRemoteKey, this);
    });
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) {
      this.previousPad = { left: false, right: false, up: false, down: false, back: false };
      return;
    }
    const left = Boolean(pad.left || pad.leftStick.x < -0.5);
    const right = Boolean(pad.right || pad.leftStick.x > 0.5);
    const up = Boolean(pad.up || pad.leftStick.y < -0.5);
    const down = Boolean(pad.down || pad.leftStick.y > 0.5);
    const back = Boolean(pad.B);
    if (left && !this.previousPad.left) this.moveCategory(-1);
    if (right && !this.previousPad.right) this.moveCategory(1);
    if (up && !this.previousPad.up) this.moveItem(-1);
    if (down && !this.previousPad.down) this.moveItem(1);
    if (back && !this.previousPad.back) this.closeArchive();
    this.previousPad = { left, right, up, down, back };
  }

  private handleRemoteKey(event: KeyboardEvent): void {
    const action = resolveRemoteAction(event);
    if (!action) return;
    if (action === 'back' || action === 'red') {
      event.preventDefault();
      this.closeArchive();
    } else if (action === 'yellow') {
      event.preventDefault();
      this.moveCategory(1);
    } else if (action === 'blue') {
      event.preventDefault();
      this.moveCategory(-1);
    }
  }

  private refreshSnapshot(): void {
    const manager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = manager?.load();
    this.snapshot = buildCollectionArchiveSnapshot(loaded && 'data' in loaded ? loaded.data : null);
    this.categoryIndex = Math.min(this.categoryIndex, Math.max(0, this.snapshot.categories.length - 1));
    const items = this.currentCategory()?.items ?? [];
    this.itemIndex = Math.min(this.itemIndex, Math.max(0, items.length - 1));
  }

  private currentCategory(): CollectionArchiveCategory | undefined {
    return this.snapshot.categories[this.categoryIndex];
  }

  private moveCategory(direction: number): void {
    const count = this.snapshot.categories.length;
    if (!count) return;
    this.categoryIndex = (this.categoryIndex + direction + count) % count;
    this.itemIndex = 0;
    this.render();
  }

  private moveItem(direction: number): void {
    const count = this.currentCategory()?.items.length ?? 0;
    if (!count) return;
    this.itemIndex = (this.itemIndex + direction + count) % count;
    this.render();
  }

  private selectCategory(index: number): void {
    this.categoryIndex = index;
    this.itemIndex = 0;
    this.render();
  }

  private selectItem(index: number): void {
    const count = this.currentCategory()?.items.length ?? 0;
    if (!count) return;
    this.itemIndex = Math.max(0, Math.min(count - 1, index));
    this.render();
  }

  private closeArchive(): void {
    if (!this.sys.isActive()) return;
    this.scene.stop();
    this.scene.resume('main-menu');
  }

  browserTestSnapshot(): CollectionArchiveSnapshot & { selectedCategoryIndex: number; selectedItemIndex: number; layoutMode: 'touch-focus' | 'desktop-grid' } {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Collection archive browser test mode is not enabled.');
    return { ...this.snapshot, selectedCategoryIndex: this.categoryIndex, selectedItemIndex: this.itemIndex, layoutMode: this.touchLayout ? 'touch-focus' : 'desktop-grid' };
  }

  private render(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const category = this.currentCategory();
    const centerX = width / 2;
    drawUiBackdrop(this, 'archive');

    this.add.text(48, 30, 'KOLEKSİYON ARŞİVİ', {
      fontFamily: 'Georgia, serif', fontSize: this.touchLayout ? '30px' : '34px', color: '#e9dfcb', fontStyle: 'bold'
    });
    this.add.text(50, 76, 'Keşfettiklerin burada saklanır. Bilinmeyen kayıtlar gizli kalır.', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '15px' : '14px', color: '#a99da0'
    });
    this.add.text(width - 48, 42, `KEŞİF  ${this.snapshot.discovered}/${this.snapshot.total}    •    TAMAMLANAN  ${this.snapshot.completedCategories}/6`, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#d4bd92'
    }).setOrigin(1, 0);

    if (this.touchLayout) this.renderTouch(category);
    else this.renderDesktop(category);

    const back = this.add.text(width / 2, height - 34, 'ESC / B  •  GERİ', {
      fontFamily: 'Arial, sans-serif', fontSize: this.touchLayout ? '17px' : '13px', color: '#d9c9aa',
      backgroundColor: '#30272a', padding: { x: this.touchLayout ? 28 : 18, y: this.touchLayout ? 12 : 9 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.closeArchive());
  }

  private renderTouch(category: CollectionArchiveCategory | undefined): void {
    const tabs = this.snapshot.categories;
    const tabWidth = 178;
    tabs.forEach((entry, index) => {
      const x = 100 + index * 196;
      const selected = index === this.categoryIndex;
      const card = this.add.rectangle(x, 148, tabWidth, 62, selected ? 0x493544 : 0x28212a, 0.98)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xf0d39a : 0x756653, 0.8)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.selectCategory(index));
      this.add.text(x, 139, entry.name, { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: selected ? '#fff0ce' : '#d5c8b9', align: 'center', wordWrap: { width: tabWidth - 12 } }).setOrigin(0.5, 0);
      this.add.text(x, 168, `${entry.discovered}/${entry.total}`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b99a61' }).setOrigin(0.5, 0);
    });
    if (!category) return;
    const item = category.items[this.itemIndex];
    this.add.text(centerX, 235, category.name, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#e9dfcb' }).setOrigin(0.5);
    this.add.text(centerX, 268, `${category.discovered} / ${category.total}  •  ${category.completed ? 'TAMAMLANDI' : 'DEVAM EDİYOR'}`, { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#b99a61' }).setOrigin(0.5);
    this.add.rectangle(centerX, 390, 620, 190, 0x17131c, 0.98).setStrokeStyle(2, 0x756653, 0.85);
    this.add.text(centerX, 335, item?.discovered ? item.name : '???', { fontFamily: 'Georgia, serif', fontSize: '26px', color: item?.discovered ? '#fff0ce' : '#9c9290' }).setOrigin(0.5);
    this.add.text(centerX, 400, item?.description ?? '', { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#c7b9aa', align: 'center', wordWrap: { width: 500 }, lineSpacing: 8 }).setOrigin(0.5);
    this.add.text(centerX, 465, `KAYIT ${this.itemIndex + 1} / ${category.items.length}`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b99a61' }).setOrigin(0.5);
    this.drawArrowButton(150, 390, '‹', () => this.moveItem(-1), 92, 92);
    this.drawArrowButton(width - 150, 390, '›', () => this.moveItem(1), 92, 92);
    this.add.text(centerX, 548, category.rewardUnlocked ? `ÖDÜL AÇILDI  •  ${category.rewardName}` : `TAMAMLAMA ÖDÜLÜ  •  ${category.rewardName}  •  KİLİTLİ`, {
      fontFamily: 'Arial, sans-serif', fontSize: '14px', color: category.rewardUnlocked ? '#b9c59c' : '#9b8585', align: 'center'
    }).setOrigin(0.5);
    if (this.snapshot.grandRewardUnlocked) this.add.text(centerX, 582, 'BÜYÜK KOLEKSİYON ÖDÜLÜ AÇILDI', { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#e7c98e' }).setOrigin(0.5);
  }

  private renderDesktop(category: CollectionArchiveCategory | undefined): void {
    const items = category?.items ?? [];
    this.snapshot.categories.forEach((entry, index) => {
      const y = 166 + index * 76;
      const selected = index === this.categoryIndex;
      const card = this.add.rectangle(190, y, 300, 64, selected ? 0x493544 : 0x28212a, 0.98)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xf0d39a : 0x756653, 0.8)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.selectCategory(index));
      this.add.text(62, y - 17, entry.name, { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: selected ? '#fff0ce' : '#d5c8b9' });
      this.add.text(62, y + 7, `${entry.discovered}/${entry.total} keşfedildi`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b99a61' });
    });
    if (!category) return;
    this.add.text(390, 130, category.name, { fontFamily: 'Georgia, serif', fontSize: '27px', color: '#e9dfcb' });
    this.add.text(392, 169, category.description, { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#a99da0', wordWrap: { width: 800 } });
    this.add.text(1190, 207, `${category.discovered}/${category.total}`, { fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#d4bd92' }).setOrigin(1, 0);
    const pageStart = Math.floor(this.itemIndex / PAGE_SIZE) * PAGE_SIZE;
    items.slice(pageStart, pageStart + PAGE_SIZE).forEach((item, offset) => {
      const index = pageStart + offset;
      const col = offset % 2;
      const row = Math.floor(offset / 2);
      const x = 585 + col * 390;
      const y = 270 + row * 72;
      const selected = index === this.itemIndex;
      const card = this.add.rectangle(x, y, 365, 62, selected ? 0x493544 : 0x211c24, 0.98)
        .setStrokeStyle(selected ? 2 : 1, selected ? 0xf0d39a : 0x62564f, 0.8)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.selectItem(index));
      this.add.text(x - 160, y - 15, item.discovered ? item.name : '???', { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: item.discovered ? '#e9dfcb' : '#8e8585' });
      this.add.text(x - 160, y + 8, item.discovered ? 'KEŞFEDİLDİ' : 'GİZLİ KAYIT', { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: item.discovered ? '#b9c59c' : '#9b8585' });
    });
    this.add.text(975, 565, `SAYFA ${Math.floor(this.itemIndex / PAGE_SIZE) + 1} / ${Math.ceil(items.length / PAGE_SIZE)}`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b99a61' }).setOrigin(0.5);
    const item = items[this.itemIndex];
    this.add.rectangle(790, 625, 770, 70, 0x17131c, 0.96).setStrokeStyle(1, 0x756653, 0.65);
    this.add.text(420, 602, item?.discovered ? item.name : '???', { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#e9dfcb' });
    this.add.text(420, 628, item?.description ?? '', { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#b9afb0', wordWrap: { width: 730 } });
    this.add.text(1190, 230, category.rewardUnlocked ? `ÖDÜL: ${category.rewardName}  •  AÇILDI` : `ÖDÜL: ${category.rewardName}  •  KİLİTLİ`, { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: category.rewardUnlocked ? '#b9c59c' : '#9b8585' }).setOrigin(1, 0);
    if (this.snapshot.grandRewardUnlocked) this.add.text(790, 690, 'BÜYÜK KOLEKSİYON ÖDÜLÜ AÇILDI', { fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#e7c98e' }).setOrigin(0.5);
  }

  private drawArrowButton(x: number, y: number, label: string, action: () => void, width: number, height: number): void {
    const button = this.add.rectangle(x, y, width, height, 0x30272a, 1).setStrokeStyle(2, 0xb99a61, 0.8).setInteractive({ useHandCursor: true });
    button.on('pointerup', action);
    this.add.text(x, y - 3, label, { fontFamily: 'Georgia, serif', fontSize: '48px', color: '#fff0ce' }).setOrigin(0.5);
  }
}
