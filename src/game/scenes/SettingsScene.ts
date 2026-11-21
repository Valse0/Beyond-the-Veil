import Phaser from 'phaser';
import type { SaveManager } from '../../systems/save/save-manager.js';
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings, updateGameSettings, type GameSettings } from '../../gameplay/settings/settings-runtime.js';
import { resolveRemoteAction } from '../input/platform-input.js';

type SettingKey = keyof GameSettings;

export class SettingsScene extends Phaser.Scene {
  private returnScene = 'main-menu';
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };
  private rows: Phaser.GameObjects.GameObject[] = [];
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private actions: Array<() => void> = [];
  private selected = 0;
  private status?: Phaser.GameObjects.Text;
  private previousPadConfirm = false;
  private previousPadBack = false;
  private previousPadNavigation = '';

  constructor() { super('settings'); }

  init(data: { returnScene?: string }): void {
    this.returnScene = data.returnScene ?? 'main-menu';
  }

  create(): void {
    const manager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = manager?.load();
    if (loaded && 'data' in loaded) this.settings = normalizeGameSettings(loaded.data.settings);
    const w = this.scale.width, h = this.scale.height;
    const compact = Boolean(this.sys.game.device.input.touch) || w < 960 || h < 520;
    this.cameras.main.setBackgroundColor('#0b0b10');
    this.add.rectangle(w / 2, h / 2, w, h, 0x08070b, 0.94);
    this.add.rectangle(w / 2, h / 2, Math.min(900, w * 0.92), Math.min(630, h * 0.9), 0x1a151d, 0.99)
      .setStrokeStyle(2, 0x987b52, 0.9);
    this.add.text(w / 2, h * 0.12, 'AYARLAR VE ERİŞİLEBİLİRLİK', {
      fontFamily: 'Georgia', fontSize: compact ? '25px' : '32px', color: '#e8d6ad', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(w / 2, h * 0.19, 'Tercihler bu cihazdaki yerel profilinde saklanır.', {
      fontSize: compact ? '13px' : '15px', color: '#b9a991'
    }).setOrigin(0.5);

    const rows: Array<{ key: SettingKey; label: string; detail: string; values: unknown[]; format: (value: GameSettings[SettingKey]) => string; next: (value: GameSettings[SettingKey]) => Partial<GameSettings> }> = [
      { key: 'screenShake', label: 'EKRAN SARSINTISI', detail: 'Darbe ve yeteneklerde kamera hareketi', values: [true, false], format: v => v ? 'AÇIK' : 'KAPALI', next: v => ({ screenShake: !v as boolean }) },
      { key: 'screenFlash', label: 'EKRAN FLAŞI', detail: 'Savaş ve yetenek flaş efektleri', values: [true, false], format: v => v ? 'AÇIK' : 'KAPALI', next: v => ({ screenFlash: !v as boolean }) },
      { key: 'damageNumbers', label: 'HASAR SAYILARI', detail: 'Düşmanların üzerinde verilen hasarı göster', values: [true, false], format: v => v ? 'AÇIK' : 'KAPALI', next: v => ({ damageNumbers: !v as boolean }) },
      { key: 'touchControlsVisible', label: 'DOKUNMATİK KONTROLLER', detail: 'Telefon ve tabletlerde sanal kontroller', values: [true, false], format: v => v ? 'GÖSTER' : 'GİZLE', next: v => ({ touchControlsVisible: !v as boolean }) },
      { key: 'touchControlScale', label: 'DOKUNMATİK KONTROL BOYUTU', detail: 'Sanal kontrol alanlarının boyutu', values: [0.85, 1, 1.15], format: v => v === 0.85 ? 'KÜÇÜK' : v === 1.15 ? 'BÜYÜK' : 'NORMAL', next: v => ({ touchControlScale: (v === 0.85 ? 1 : v === 1 ? 1.15 : 0.85) as GameSettings['touchControlScale'] }) }
    ];
    const rowTop = h * (compact ? 0.27 : 0.30);
    const rowGap = Math.min(compact ? 88 : 84, h * (compact ? 0.125 : 0.125));
    rows.forEach((row, index) => {
      const y = rowTop + index * rowGap;
      const rowWidth = Math.min(700, w * 0.82);
      const card = this.add.rectangle(w / 2, y, rowWidth, compact ? 80 : 68, 0x28212a, 0.98)
        .setStrokeStyle(2, 0x6e5a45, 0.85).setInteractive({ useHandCursor: true });
      const label = this.add.text(w / 2 - rowWidth / 2 + 20, y - 13, row.label, {
        fontSize: compact ? '18px' : '17px', color: '#f0dfbd', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      const detail = this.add.text(w / 2 - rowWidth / 2 + 20, y + 13, row.detail, {
        fontSize: compact ? '14px' : '12px', color: '#a99c8b'
      }).setOrigin(0, 0.5);
      const value = this.add.text(w / 2 + rowWidth / 2 - 22, y, '', {
        fontSize: compact ? '18px' : '16px', color: '#e5c58c', fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.rows.push(card, label, detail, value);
      const refresh = () => value.setText(row.format(this.settings[row.key]));
      refresh();
      const activate = () => this.persist(row.next(this.settings[row.key]));
      card.on('pointerup', () => { this.selected = index; this.refreshSelection(); activate(); });
      this.buttons.push(card);
      this.actions.push(activate);
      card.setData('refresh', refresh);
    });
    const backY = Math.min(h * 0.92, rowTop + rows.length * rowGap + 15);
    const back = this.add.rectangle(w / 2, backY, compact ? 240 : 270, compact ? 54 : 58, 0x5b3d32, 1)
      .setStrokeStyle(2, 0xb99a61).setInteractive({ useHandCursor: true });
    this.add.text(w / 2, backY, 'GERİ DÖN', { fontSize: compact ? '16px' : '18px', color: '#fff2df', fontStyle: 'bold' }).setOrigin(0.5);
    back.on('pointerup', () => this.close());
    this.buttons.push(back);
    this.actions.push(() => this.close());
    this.status = this.add.text(w / 2, h * 0.96, '', { fontSize: '12px', color: '#e29a8d' }).setOrigin(0.5);
    this.refreshSelection();

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      const action = resolveRemoteAction(event);
      if (action === 'back' || action === 'red' || event.key === 'Escape' || event.key === 'Backspace') { event.preventDefault(); this.close(); return; }
      if (action === 'confirm' || action === 'green' || event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.actions[this.selected]?.(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { this.selected = Math.min(this.buttons.length - 1, this.selected + 1); this.refreshSelection(); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { this.selected = Math.max(0, this.selected - 1); this.refreshSelection(); }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.rows = []; this.buttons = []; this.actions = []; });
  }

  browserTestSnapshot(): { screenShake: boolean; screenFlash: boolean; damageNumbers: boolean; touchControlsVisible: boolean; touchControlScale: number; selected: number; returnScene: string } {
    if (this.registry.get('browserTestMode') !== true) throw new Error('Browser test controls are disabled.');
    return { ...this.settings, selected: this.selected, returnScene: this.returnScene };
  }

  update(): void {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) { this.previousPadConfirm = false; this.previousPadBack = false; this.previousPadNavigation = ''; return; }
    const confirm = Boolean(pad.A || pad.buttons[9]?.pressed), back = Boolean(pad.B);
    if (confirm && !this.previousPadConfirm) this.actions[this.selected]?.();
    if (back && !this.previousPadBack) this.close();
    const direction = pad.down || pad.right || pad.leftStick.y > 0.5 || pad.leftStick.x > 0.5 ? 'next'
      : pad.up || pad.left || pad.leftStick.y < -0.5 || pad.leftStick.x < -0.5 ? 'prev' : '';
    if (direction && direction !== this.previousPadNavigation) {
      this.selected = Phaser.Math.Clamp(this.selected + (direction === 'next' ? 1 : -1), 0, this.buttons.length - 1);
      this.refreshSelection();
    }
    this.previousPadConfirm = confirm; this.previousPadBack = back; this.previousPadNavigation = direction;
  }

  private persist(patch: Partial<GameSettings>): void {
    const manager = this.registry.get('saveManager') as SaveManager | undefined;
    const loaded = manager?.load();
    if (!manager || !loaded || !('data' in loaded)) { this.status?.setText('KAYIT OKUNAMADI. AYAR DEĞİŞMEDİ.'); return; }
    const next = updateGameSettings(loaded.data, patch);
    try {
      manager.save(next);
      this.settings = normalizeGameSettings(next.settings);
      this.status?.setText('AYAR KAYDEDİLDİ');
      if (this.returnScene === 'run') {
        const run = this.scene.get('run') as Phaser.Scene & { refreshSettingsFromSave?: () => void };
        run.refreshSettingsFromSave?.();
      }
      this.rows.forEach(object => { const refresh = object.getData?.('refresh'); if (typeof refresh === 'function') refresh(); });
      this.refreshSelection();
    } catch { this.status?.setText('KAYIT BAŞARISIZ. ÖNCEKİ AYAR KORUNDU.'); }
  }

  private refreshSelection(): void {
    this.buttons.forEach((button, index) => button.setFillStyle(index === this.selected ? 0x463344 : 0x28212a, 0.98)
      .setStrokeStyle(index === this.selected ? 3 : 2, index === this.selected ? 0xf0d39a : 0x6e5a45, 0.95));
  }

  private close(): void {
    this.scene.resume(this.returnScene);
    this.scene.stop();
  }
}
