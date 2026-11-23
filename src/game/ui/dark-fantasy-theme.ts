import Phaser from 'phaser';
import { UI_ASSET_KEYS } from '../../data/asset-registry.js';

export type UiBackdropMood = 'menu' | 'selection' | 'preparation' | 'hub' | 'dossier' | 'panel' | 'archive';
const BACKDROP_KEY = 'veil-ui-backdrop';
const PALETTE = { abyss: 0x070a11, panel: 0x111824, gold: 0xc6a56b, teal: 0x6fa9a0 } as const;

export function preloadUiArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BACKDROP_KEY)) scene.load.image(BACKDROP_KEY, '/assets/ui/veil-menu-backdrop.svg');
  if (!scene.textures.exists(UI_ASSET_KEYS.hunterPortraits)) scene.load.spritesheet(UI_ASSET_KEYS.hunterPortraits, '/assets/ui/hunter-portraits.svg', { frameWidth: 160, frameHeight: 160 });
  if (!scene.textures.exists(UI_ASSET_KEYS.regionArt)) scene.load.spritesheet(UI_ASSET_KEYS.regionArt, '/assets/ui/region-art.svg', { frameWidth: 256, frameHeight: 160 });
}

export function drawUiBackdrop(scene: Phaser.Scene, mood: UiBackdropMood): void {
  const { width, height } = scene.scale;
  scene.cameras.main.setBackgroundColor('#070a11');
  if (scene.textures.exists(BACKDROP_KEY)) {
    scene.add.image(width / 2, height / 2, BACKDROP_KEY).setDisplaySize(width, height)
      .setAlpha(mood === 'menu' ? 0.94 : mood === 'selection' ? 0.56 : mood === 'preparation' ? 0.48 : mood === 'hub' ? 0.34 : 0.26)
      .setDepth(-1000).setName('ui-atmospheric-backdrop');
  }
  const shade = scene.add.graphics().setDepth(-999);
  shade.fillGradientStyle(PALETTE.abyss, PALETTE.abyss, 0x080d16, 0x070a11, 0.88, 0.56, 0.82, 0.74);
  shade.fillRect(0, 0, width, height);
  shade.lineStyle(1, PALETTE.gold, 0.22);
  shade.lineBetween(26, 18, width - 26, 18);
  shade.lineBetween(26, height - 19, width - 26, height - 19);
  const c = 24;
  shade.lineStyle(2, PALETTE.gold, 0.28);
  for (const [x, y, sx, sy] of [[26,18,1,1],[width-26,18,-1,1],[26,height-19,1,-1],[width-26,height-19,-1,-1]]) {
    shade.lineBetween(x, y, x + c * sx, y);
    shade.lineBetween(x, y, x, y + c * sy);
  }
  const glow = scene.add.graphics().setDepth(-998);
  glow.fillStyle(PALETTE.teal, mood === 'menu' ? 0.12 : 0.055);
  glow.fillCircle(width * 0.74, height * 0.54, Math.min(width, height) * 0.23);
  glow.fillStyle(PALETTE.gold, 0.035);
  glow.fillCircle(width * 0.2, height * 0.18, Math.min(width, height) * 0.16);
}

export function drawUiPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, accent: number = PALETTE.gold, depth = 0, alpha = 0.94): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics().setDepth(depth);
  const inset = 5;
  panel.fillStyle(PALETTE.abyss, alpha * 0.94);
  panel.fillRoundedRect(x, y, width, height, 10);
  panel.fillStyle(PALETTE.panel, alpha * 0.9);
  panel.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, 8);
  panel.lineStyle(2, accent, 0.64);
  panel.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 9);
  panel.lineStyle(1, 0xe8e0d2, 0.12);
  panel.strokeRoundedRect(x + inset, y + inset, width - inset * 2, height - inset * 2, 6);
  const cut = Math.min(18, Math.max(10, Math.min(width, height) * 0.055));
  panel.lineStyle(2, accent, 0.88);
  panel.lineBetween(x + 10, y + 1, x + 10 + cut, y + 1);
  panel.lineBetween(x + 1, y + 10, x + 1, y + 10 + cut);
  panel.lineBetween(x + width - 10, y + 1, x + width - 10 - cut, y + 1);
  panel.lineBetween(x + width - 1, y + 10, x + width - 1, y + 10 + cut);
  panel.lineBetween(x + 10, y + height - 1, x + 10 + cut, y + height - 1);
  panel.lineBetween(x + 1, y + height - 10, x + 1, y + height - 10 - cut);
  panel.lineBetween(x + width - 10, y + height - 1, x + width - 10 - cut, y + height - 1);
  panel.lineBetween(x + width - 1, y + height - 10, x + width - 1, y + height - 10 - cut);
  return panel;
}
