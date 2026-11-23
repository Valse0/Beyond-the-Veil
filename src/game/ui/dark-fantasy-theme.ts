import Phaser from 'phaser';
import { UI_ASSET_KEYS } from '../../data/asset-registry.js';

export type UiBackdropMood = 'menu' | 'selection' | 'regions' | 'preparation' | 'hub' | 'dossier' | 'panel' | 'archive';
const BACKDROP_KEY = 'veil-ui-backdrop';
const SELECTION_BACKDROP_KEY = 'veil-ui-selection-backdrop';
const PREPARATION_BACKDROP_KEY = 'veil-ui-preparation-backdrop';
const REGION_SELECTION_BACKDROP_KEY = 'veil-ui-region-selection-backdrop';
const HUNTER_IDLE_KEY = 'ui-cursed-hunter-idle';
const REGION_CARD_KEYS: Record<string, string> = {
  'cursed-forest': 'region-card-cursed-forest',
  'forgotten-graveyard': 'region-card-forgotten-graveyard',
  'deep-dungeon': 'region-card-deep-dungeon',
  'rotten-swamp': 'region-card-rotten-swamp',
  'cursed-castle': 'region-card-cursed-castle'
};
const PALETTE = { abyss: 0x070a11, panel: 0x111824, gold: 0xc6a56b, teal: 0x6fa9a0 } as const;

export function preloadUiArt(scene: Phaser.Scene): void {
  if (!scene.textures.exists(BACKDROP_KEY)) scene.load.image(BACKDROP_KEY, '/assets/ui/menu-backdrop.jpg');
  if (!scene.textures.exists(SELECTION_BACKDROP_KEY)) scene.load.image(SELECTION_BACKDROP_KEY, '/assets/ui/selection-backdrop.jpg');
  if (!scene.textures.exists(PREPARATION_BACKDROP_KEY)) scene.load.image(PREPARATION_BACKDROP_KEY, '/assets/ui/preparation-backdrop.jpg');
  if (!scene.textures.exists(REGION_SELECTION_BACKDROP_KEY)) scene.load.image(REGION_SELECTION_BACKDROP_KEY, '/assets/ui/region-selection-backdrop.jpg');
  if (!scene.textures.exists(HUNTER_IDLE_KEY)) scene.load.spritesheet(HUNTER_IDLE_KEY, '/assets/prototype/characters/player/cursed-hunter-idle.png', { frameWidth: 48, frameHeight: 48 });
  if (!scene.textures.exists(UI_ASSET_KEYS.hunterPortraits)) scene.load.spritesheet(UI_ASSET_KEYS.hunterPortraits, '/assets/ui/hunter-portraits.png', { frameWidth: 160, frameHeight: 160 });
  if (!scene.textures.exists(UI_ASSET_KEYS.regionArt)) scene.load.spritesheet(UI_ASSET_KEYS.regionArt, '/assets/ui/region-art.svg', { frameWidth: 256, frameHeight: 160 });
  if (!scene.textures.exists(UI_ASSET_KEYS.gameOverBackdrop)) scene.load.image(UI_ASSET_KEYS.gameOverBackdrop, '/assets/ui/game-over-backdrop.jpg');
  for (const key of ['upgrade-icon-weapon', 'upgrade-icon-passive', 'upgrade-icon-base']) {
    if (!scene.textures.exists(key)) scene.load.image(key, '/assets/ui/' + key + '.png');
  }
  for (const key of Object.values(REGION_CARD_KEYS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, '/assets/ui/' + key + '.png');
  }
}

export function regionCardTextureKey(regionId: string): string {
  return REGION_CARD_KEYS[regionId] ?? UI_ASSET_KEYS.regionArt;
}

export function drawUiBackdrop(scene: Phaser.Scene, mood: UiBackdropMood): void {
  const { width, height } = scene.scale;
  scene.cameras.main.setBackgroundColor('#070a11');
  const backdropKey = mood === 'menu' ? BACKDROP_KEY
    : mood === 'selection' ? SELECTION_BACKDROP_KEY
    : mood === 'regions' ? REGION_SELECTION_BACKDROP_KEY
    : mood === 'preparation' ? PREPARATION_BACKDROP_KEY
    : SELECTION_BACKDROP_KEY;
  if (scene.textures.exists(backdropKey)) {
    scene.add.image(width / 2, height / 2, backdropKey).setDisplaySize(width, height)
      .setAlpha(mood === 'menu' ? 1 : mood === 'selection' ? 0.96 : mood === 'preparation' ? 0.94 : 0.78)
      .setDepth(-1000).setName('ui-atmospheric-backdrop');
  }
  const shade = scene.add.graphics().setDepth(-999);
  const shadeAlpha = mood === 'menu' ? 0.42 : mood === 'selection' ? 0.5 : mood === 'regions' ? 0.42 : mood === 'preparation' ? 0.56 : 0.66;
  shade.fillGradientStyle(PALETTE.abyss, PALETTE.abyss, 0x080d16, 0x070a11, shadeAlpha, shadeAlpha * 0.72, shadeAlpha, shadeAlpha * 0.88);
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
  panel.fillRect(x, y, width, height);
  panel.fillStyle(PALETTE.panel, alpha * 0.9);
  panel.fillRect(x + 2, y + 2, width - 4, height - 4);
  panel.lineStyle(2, accent, 0.64);
  panel.strokeRect(x + 1, y + 1, width - 2, height - 2);
  panel.lineStyle(1, 0xe8e0d2, 0.12);
  panel.strokeRect(x + inset, y + inset, width - inset * 2, height - inset * 2);
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
