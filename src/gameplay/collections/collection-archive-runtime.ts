import { COLLECTIONS, type CollectionId } from '../../data/collections.js';
import { ENEMIES } from '../../data/enemies.js';
import { WEAPONS } from '../../data/weapons.js';
import { RELICS } from '../../data/relics.js';
import { REGIONS } from '../../data/regions.js';
import { CHARACTERS } from '../../data/characters.js';
import type { SaveData } from '../../systems/save/save-types.js';

export interface CollectionArchiveItem {
  id: string;
  name: string;
  description: string;
  discovered: boolean;
}
export interface CollectionArchiveCategory {
  id: CollectionId;
  name: string;
  description: string;
  discovered: number;
  total: number;
  completed: boolean;
  rewardName: string;
  rewardUnlocked: boolean;
  items: CollectionArchiveItem[];
}
export interface CollectionArchiveSnapshot {
  categories: CollectionArchiveCategory[];
  discovered: number;
  total: number;
  completedCategories: number;
  grandRewardUnlocked: boolean;
}

function describeItem(collectionId: CollectionId, itemId: string): { name: string; description: string } {
  if (collectionId === 'bestiary') {
    const item = ENEMIES.find(entry => entry.id === itemId);
    return item ? { name: item.name, description: `${item.specialRule} Karşı hamle: ${item.attack.counter}` } : { name: itemId, description: '' };
  }
  if (collectionId === 'arsenal') {
    const item = WEAPONS.find(entry => entry.id === itemId);
    return item ? { name: item.name, description: `${item.category} • ${item.description}` } : { name: itemId, description: '' };
  }
  if (collectionId === 'relic-vault') {
    const item = RELICS.find(entry => entry.id === itemId);
    const region = item ? REGIONS.find(entry => entry.id === item.regionId) : undefined;
    return item ? { name: item.name, description: `${region?.name ?? 'Bilinmeyen bölge'} • ${item.rarity === 'legendary' ? 'Efsanevi' : 'Destansı'} • ${item.description}` } : { name: itemId, description: '' };
  }
  if (collectionId === 'story-archive') {
    const region = REGIONS.find(entry => entry.explorationPoints.some(point => point.id === itemId));
    const passage = region?.explorationPoints.find(point => point.id === itemId);
    return passage ? { name: passage.name, description: `${region!.name} • ${passage.discovery}` } : { name: itemId, description: '' };
  }
  if (collectionId === 'character-biographies') {
    const character = CHARACTERS.find(entry => entry.id === itemId);
    return character ? { name: character.name, description: `${character.role} • ${character.story}` } : { name: itemId, description: '' };
  }
  const character = CHARACTERS.find(entry => entry.mastery.some(milestone => milestone.level === 10 && milestone.rewardId === itemId));
  const reward = character?.mastery.find(milestone => milestone.level === 10 && milestone.rewardId === itemId);
  return character && reward
    ? { name: character.name + ' — Ustalık Kostümü', description: reward.description }
    : { name: 'Ustalık Kostümü', description: '' };
}

export function buildCollectionArchiveSnapshot(save: SaveData | null): CollectionArchiveSnapshot {
  const collections = save?.collections;
  const categories = COLLECTIONS.map(definition => {
    const sourceIds: readonly string[] = !collections ? [] : definition.id === 'bestiary'
      ? collections.discoveredEnemyIds
      : definition.id === 'arsenal'
        ? collections.discoveredWeaponIds
        : definition.id === 'relic-vault'
          ? collections.relicIds
          : definition.id === 'story-archive'
            ? collections.discoveredLoreIds
            : definition.id === 'character-biographies'
              ? collections.discoveredCharacterBioIds
              : collections.unlockedMasteryRewardIds;
    const discoveredIds = new Set(sourceIds);
    const items = definition.itemIds.map(itemId => {
      const discovered = discoveredIds.has(itemId);
      const details = describeItem(definition.id, itemId);
      return {
        id: itemId,
        name: discovered ? details.name : '???',
        description: discovered ? details.description : 'Bu kayıt henüz keşfedilmedi.',
        discovered
      };
    });
    const discovered = items.filter(item => item.discovered).length;
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      discovered,
      total: definition.itemIds.length,
      completed: discovered === definition.itemIds.length,
      rewardName: definition.rewardName,
      rewardUnlocked: Boolean(collections?.unlockedCollectionRewardIds.includes(definition.rewardId)),
      items
    };
  });
  return {
    categories,
    discovered: categories.reduce((sum, category) => sum + category.discovered, 0),
    total: categories.reduce((sum, category) => sum + category.total, 0),
    completedCategories: categories.filter(category => category.completed).length,
    grandRewardUnlocked: Boolean(collections?.unlockedCollectionRewardIds.includes('veil-archivist-regalia'))
  };
}
