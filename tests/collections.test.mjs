import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTIONS } from '../.test-dist/src/data/collections.js';
import { ACHIEVEMENTS } from '../.test-dist/src/data/achievements.js';
import { ENEMIES } from '../.test-dist/src/data/enemies.js';
import { WEAPONS } from '../.test-dist/src/data/weapons.js';
import { RELICS } from '../.test-dist/src/data/relics.js';
import { REGIONS } from '../.test-dist/src/data/regions.js';
import { CHARACTERS } from '../.test-dist/src/data/characters.js';
import { applyCollectionProgress, getCollectionProgress } from '../.test-dist/src/gameplay/progression/collections.js';
import { applyRunResult } from '../.test-dist/src/gameplay/run/run-results.js';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';

test('collection catalog mirrors authored enemy, weapon, relic, lore, biography and mastery content', () => {
  const counts = Object.fromEntries(COLLECTIONS.map(item => [item.id, item.itemIds.length]));
  assert.deepEqual(counts, {
    bestiary: 25, arsenal: 12, 'relic-vault': 10, 'story-archive': 5,
    'character-biographies': 5, 'mastery-attire': 5
  });
  assert.equal(ACHIEVEMENTS.filter(item => item.collectionId).length, 6);
  assert.ok(ACHIEVEMENTS.some(item => item.id === 'grand-collector'));
  for (const collection of COLLECTIONS) {
    assert.equal(new Set(collection.itemIds).size, collection.itemIds.length, collection.id);
    assert.ok(collection.itemIds.every(id => typeof id === 'string' && id.length > 0));
    assert.ok(collection.achievementId);
    assert.ok(collection.rewardId);
  }
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'bestiary').itemIds, ENEMIES.map(item => item.id));
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'arsenal').itemIds, WEAPONS.map(item => item.id));
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'relic-vault').itemIds, RELICS.map(item => item.id));
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'story-archive').itemIds, REGIONS.map(item => item.explorationPoints[0].id));
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'character-biographies').itemIds, CHARACTERS.map(item => item.id));
  assert.deepEqual(COLLECTIONS.find(item => item.id === 'mastery-attire').itemIds, CHARACTERS.map(item => item.mastery.find(m => m.level === 10).rewardId));
});

test('partial discoveries update counts, ignore unknown entries and preserve unrelated lore records', () => {
  const save = createInitialSaveData();
  save.collections.discoveredLoreIds = ['legacy-lore-entry'];
  const result = applyCollectionProgress(save.collections, {
    enemyIds: ['rootbound-husk', 'rootbound-husk', 'unknown-enemy'],
    weaponIds: ['veil-bolt', 'unknown-weapon'],
    characterBioIds: ['cursed-hunter'],
    loreIds: ['cursed-forest-lore', 'unknown-lore']
  });
  const progress = getCollectionProgress(result);
  assert.equal(progress.find(item => item.id === 'bestiary').discovered, 1);
  assert.equal(progress.find(item => item.id === 'arsenal').discovered, 1);
  assert.equal(progress.find(item => item.id === 'character-biographies').discovered, 1);
  assert.deepEqual(result.completedCollectionIds, []);
  assert.deepEqual(result.unlockedCollectionRewardIds, []);
  assert.deepEqual(result.discoveredEnemyIds, ['rootbound-husk']);
  assert.deepEqual(result.discoveredLoreIds, ['legacy-lore-entry', 'cursed-forest-lore']);
});

test('full collections complete once and grant six rewards plus the grand-completion reward', () => {
  let save = createInitialSaveData();
  for (const character of CHARACTERS) save.collections.characterMastery[character.id] = 249;
  const discoveries = {
    enemyIdsEarned: ENEMIES.map(item => item.id),
    weaponIdsEarned: WEAPONS.map(item => item.id),
    relicIdsEarned: RELICS.map(item => item.id),
    loreIdsEarned: REGIONS.map(item => item.explorationPoints[0].id)
  };
  for (const character of CHARACTERS) {
    save = applyRunResult(save, {
      regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: character.id, kills: 0,
      ...discoveries
    });
  }
  assert.deepEqual(save.collections.completedCollectionIds, COLLECTIONS.map(item => item.id));
  assert.equal(save.collections.unlockedCollectionRewardIds.length, 7);
  assert.ok(save.collections.unlockedCollectionRewardIds.includes('veil-archivist-regalia'));
  assert.equal(save.collections.completedAchievementIds.filter(id => id.startsWith('collection-')).length, 6);
  assert.ok(save.collections.completedAchievementIds.includes('grand-collector'));
  assert.equal(save.collections.discoveredEnemyIds.length, 25);
  assert.equal(save.collections.discoveredWeaponIds.length, 12);
  assert.equal(save.collections.discoveredCharacterBioIds.length, 5);
  assert.equal(save.collections.discoveredLoreIds.filter(id => id.endsWith('-lore')).length, 5);
  assert.equal(save.collections.relicIds.length, 10);
  assert.equal(save.collections.unlockedMasteryRewardIds.filter(id => CHARACTERS.some(c => c.mastery.some(m => m.level === 10 && m.rewardId === id))).length, 5);
  const again = applyRunResult(save, {
    regionId: 'cursed-forest', won: true, soulEssenceEarned: 0, characterId: 'cursed-hunter', kills: 0,
    ...discoveries
  });
  assert.equal(again.collections.unlockedCollectionRewardIds.length, 7);
  assert.equal(again.collections.completedAchievementIds.filter(id => id.startsWith('collection-')).length, 6);
});

test('relics granted by achievements count toward relic-vault completion immediately', () => {
  const save = createInitialSaveData();
  const achievementRelics = new Set(['forest-heart', 'king-crown-shard', 'grave-lament']);
  save.collections.relicIds = RELICS.filter(item => !achievementRelics.has(item.id)).map(item => item.id);
  const result = applyRunResult(save, {
    regionId: 'cursed-forest', won: true, soulEssenceEarned: 0,
    characterId: 'cursed-hunter', kills: 100, explorationEventsCompleted: 3
  });
  assert.equal(result.collections.relicIds.length, 10);
  assert.ok(result.collections.completedCollectionIds.includes('relic-vault'));
  assert.ok(result.collections.completedAchievementIds.includes('collection-relic-vault'));
  assert.ok(result.collections.unlockedCollectionRewardIds.includes('relic-curator'));
});
