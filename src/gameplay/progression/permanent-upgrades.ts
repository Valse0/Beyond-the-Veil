export interface PermanentUpgradeDefinition {
  id: 'maxHealth' | 'attackPower' | 'moveSpeed' | 'armor' | 'xpBonus' | 'rerolls';
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

export const PERMANENT_UPGRADES: readonly PermanentUpgradeDefinition[] = [
  { id: 'maxHealth', name: 'Avcının Canı', description: 'Maksimum canı artırır (+15 HP / seviye).', baseCost: 50, maxLevel: 5 },
  { id: 'attackPower', name: 'Saldırı Gücü', description: 'Verilen hasarı artırır (%+5 / seviye).', baseCost: 75, maxLevel: 5 },
  { id: 'moveSpeed', name: 'Hareket Hızı', description: 'Yürüme ve koşu hızını artırır (%+4 / seviye).', baseCost: 60, maxLevel: 5 },
  { id: 'armor', name: 'Zırh ve Direnç', description: 'Gelen hasarı azaltır (+2 / seviye).', baseCost: 70, maxLevel: 5 },
  { id: 'xpBonus', name: 'Ruh Deneyimi', description: 'Kazanılan XP miktarını artırır (%+8 / seviye).', baseCost: 80, maxLevel: 5 },
  { id: 'rerolls', name: 'Kutsal Yenileme', description: 'Seviye atlamada ekstra yenileme hakkı verir (+1 / seviye).', baseCost: 100, maxLevel: 3 }
] as const;

export interface PermanentUpgradeRespecQuote {
  totalInvested: number;
  fee: number;
  refund: number;
}

export function calculatePermanentUpgradeRespec(levels: Record<string, unknown> | undefined): PermanentUpgradeRespecQuote {
  const source = levels ?? {};
  const totalInvested = PERMANENT_UPGRADES.reduce((total, upgrade) => {
    const level = safeLevel(source, upgrade.id);
    return total + upgrade.baseCost * (level * (level + 1) / 2);
  }, 0);
  const fee = Math.ceil(totalInvested * 0.1);
  return { totalInvested, fee, refund: totalInvested - fee };
}

export interface PermanentUpgradeEffects {
  maxHealthBonus: number;
  damageMultiplier: number;
  moveSpeedMultiplier: number;
  armorBonus: number;
  xpGainMultiplier: number;
  extraRerolls: number;
}

const UPGRADE_BY_ID = new Map(PERMANENT_UPGRADES.map(upgrade => [upgrade.id, upgrade]));

function safeLevel(levels: Record<string, unknown>, id: string): number {
  const value = levels[id];
  const definition = UPGRADE_BY_ID.get(id as PermanentUpgradeDefinition['id']);
  if (!definition || typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(definition.maxLevel, Math.max(0, Math.floor(value)));
}

export function isValidPermanentUpgradeRecord(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, level]) => {
    const definition = UPGRADE_BY_ID.get(id as PermanentUpgradeDefinition['id']);
    return Boolean(definition) && typeof level === 'number' && Number.isInteger(level)
      && Number.isFinite(level) && level >= 0 && level <= definition!.maxLevel;
  });
}

export function derivePermanentUpgradeEffects(levels: Record<string, unknown> | undefined): PermanentUpgradeEffects {
  const source = levels ?? {};
  const maxHealth = safeLevel(source, 'maxHealth');
  const attackPower = safeLevel(source, 'attackPower');
  const moveSpeed = safeLevel(source, 'moveSpeed');
  const armor = safeLevel(source, 'armor');
  const xpBonus = safeLevel(source, 'xpBonus');
  const rerolls = safeLevel(source, 'rerolls');
  return {
    maxHealthBonus: maxHealth * 15,
    damageMultiplier: 1 + attackPower * 0.05,
    moveSpeedMultiplier: 1 + moveSpeed * 0.04,
    armorBonus: armor * 2,
    xpGainMultiplier: 1 + xpBonus * 0.08,
    extraRerolls: rerolls
  };
}

export function getPermanentUpgradeDefinition(id: string): PermanentUpgradeDefinition | undefined {
  return UPGRADE_BY_ID.get(id as PermanentUpgradeDefinition['id']);
}

export function getPermanentUpgradeCost(id: string, currentLevel: number): number | null {
  const definition = getPermanentUpgradeDefinition(id);
  if (!definition || !Number.isInteger(currentLevel) || currentLevel < 0 || currentLevel >= definition.maxLevel) return null;
  return definition.baseCost * (currentLevel + 1);
}
