import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectionArchiveSnapshot } from '../.test-dist/src/gameplay/collections/collection-archive-runtime.js';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';

test('archive exposes six catalog-backed collections and masks unknown entries', () => {
  const snapshot = buildCollectionArchiveSnapshot(null);
  assert.equal(snapshot.categories.length, 6);
  assert.deepEqual(snapshot.categories.map(item => item.total), [25, 12, 10, 5, 5, 5]);
  assert.equal(snapshot.discovered, 0);
  assert.equal(snapshot.categories[0]?.items[0]?.name, '???');
  assert.equal(snapshot.categories[0]?.items[0]?.description, 'Bu kayıt henüz keşfedilmedi.');
  assert.equal(snapshot.grandRewardUnlocked, false);
});

test('archive resolves discovered catalog entries and only reports saved rewards', () => {
  const save = createInitialSaveData();
  save.collections.discoveredEnemyIds = ['rootbound-husk'];
  save.collections.discoveredWeaponIds = ['veil-bolt'];
  save.collections.relicIds = ['forest-heart'];
  save.collections.discoveredLoreIds = ['cursed-forest-lore'];
  save.collections.discoveredCharacterBioIds = ['cursed-hunter'];
  save.collections.unlockedMasteryRewardIds = ['ashen-trail'];
  save.collections.unlockedCollectionRewardIds = ['bestiary-scholar', 'veil-archivist-regalia'];
  const snapshot = buildCollectionArchiveSnapshot(save);
  assert.equal(snapshot.discovered, 6);
  assert.equal(snapshot.completedCategories, 0);
  assert.equal(snapshot.categories[0]?.items[0]?.name, 'Kök Tutsağı');
  assert.equal(snapshot.categories[1]?.items[0]?.name, 'Eşik Kıvılcımı');
  assert.equal(snapshot.categories[2]?.items[1]?.name, 'Köklerin Kalbi');
  assert.equal(snapshot.categories[3]?.items[0]?.name, 'Terk edilmiş avcı kampı');
  assert.equal(snapshot.categories[4]?.items[0]?.name, 'Lanetli Avcı');
  assert.equal(snapshot.categories[5]?.items[0]?.discovered, true);
  assert.equal(snapshot.categories[0]?.rewardUnlocked, true);
  assert.equal(snapshot.categories[1]?.rewardUnlocked, false);
  assert.equal(snapshot.grandRewardUnlocked, true);
});
