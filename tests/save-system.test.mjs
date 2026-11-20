import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { SAVE_BACKUP_KEY, SAVE_STORAGE_KEY } from '../.test-dist/src/systems/save/save-storage.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const fixedNow = () => '2026-11-18T12:00:00.000Z';

test('creates a new profile with the first hunter and region unlocked', () => {
  const manager = new SaveManager(new MemoryStorage(), fixedNow);
  const result = manager.load();
  assert.equal(result.status, 'created');
  assert.deepEqual(result.data.progression.unlockedCharacterIds, ['cursed-hunter']);
  assert.deepEqual(result.data.progression.unlockedRegionIds, ['cursed-forest']);
});

test('save and load round-trip preserves progression and collections', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 125;
  data.progression.completedRuns = 3;
  data.collections.characterMastery['cursed-hunter'] = 4;
  manager.save(data);
  const loaded = new SaveManager(storage, fixedNow).load();
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.data.progression.soulEssence, 125);
  assert.equal(loaded.data.progression.completedRuns, 3);
  assert.equal(loaded.data.collections.characterMastery['cursed-hunter'], 4);
});

test('keeps the previous valid save as backup before overwriting', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const first = createInitialSaveData(fixedNow());
  manager.save(first);
  const second = { ...first, progression: { ...first.progression, soulEssence: 50 } };
  manager.save(second);
  const backup = JSON.parse(storage.getItem(SAVE_BACKUP_KEY));
  assert.equal(backup.progression.soulEssence, 0);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).progression.soulEssence, 50);
});

test('recovers a corrupted primary from the last known-good backup', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  manager.save(createInitialSaveData(fixedNow()));
  manager.save({ ...createInitialSaveData(fixedNow()), progression: { ...createInitialSaveData(fixedNow()).progression, soulEssence: 75 } });
  storage.setItem(SAVE_STORAGE_KEY, '{broken json');
  const result = manager.load();
  assert.equal(result.status, 'recovered');
  assert.equal(result.data.progression.soulEssence, 0);
  assert.doesNotThrow(() => JSON.parse(storage.getItem(SAVE_STORAGE_KEY)));
});

test('migrates a version-zero save and preserves known fields', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    schemaVersion: 0,
    profile: { createdAt: '2026-01-01T00:00:00.000Z' },
    progression: { soulEssence: 30, completedRuns: 2, unlockedCharacterIds: ['cursed-hunter'], unlockedRegionIds: ['cursed-forest'] },
    settings: { musicVolume: 0.5 }
  }));
  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.progression.soulEssence, 30);
  assert.equal(result.data.progression.completedRuns, 2);
  assert.equal(result.data.settings.musicVolume, 0.5);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('refuses to overwrite a save from a newer schema version', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
  const manager = new SaveManager(storage, fixedNow);
  assert.throws(() => manager.save(createInitialSaveData(fixedNow())), /newer save/i);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 99);
  assert.equal(manager.load().status, 'unsupported');
});

test('import validates data and export produces portable JSON', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 42;
  const imported = manager.import(JSON.stringify(data));
  assert.equal(imported.progression.soulEssence, 42);
  const exported = JSON.parse(manager.export());
  assert.equal(exported.progression.soulEssence, 42);
  assert.throws(() => manager.import('{not json'));
});

test('rejects invalid values without damaging the current save', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  manager.save(createInitialSaveData(fixedNow()));
  const before = storage.getItem(SAVE_STORAGE_KEY);
  const initial = createInitialSaveData(fixedNow());
  const invalid = { ...initial, progression: { ...initial.progression, soulEssence: -1 } };
  assert.throws(() => manager.save(invalid), /invalid save/i);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), before);
});

test('reset removes primary and backup save keys', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  manager.save(createInitialSaveData(fixedNow()));
  manager.save(createInitialSaveData(fixedNow()));
  manager.reset();
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), null);
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), null);
});

test('permanent upgrades purchasing deducts soul essence and persists level', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 200;
  manager.save(data);

  assert.equal(manager.getPermanentUpgradeLevel('maxHealth'), 0);
  const success = manager.purchasePermanentUpgrade('maxHealth', 50, 5);
  assert.equal(success, true);
  assert.equal(manager.getPermanentUpgradeLevel('maxHealth'), 1);

  const reloaded = new SaveManager(storage, fixedNow);
  assert.equal(reloaded.load().data.progression.soulEssence, 150);
  assert.equal(reloaded.getPermanentUpgradeLevel('maxHealth'), 1);
});

test('permanent upgrade purchase fails if insufficient funds or max level reached', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 50;
  manager.save(data);

  assert.equal(manager.purchasePermanentUpgrade('attackPower', 75, 5), false);
  assert.equal(manager.getPermanentUpgradeLevel('attackPower'), 0);

  data.progression.soulEssence = 100;
  manager.save(data);
  assert.equal(manager.purchasePermanentUpgrade('attackPower', 75, 5), true);
  assert.equal(manager.getPermanentUpgradeLevel('attackPower'), 1);

  assert.equal(manager.purchasePermanentUpgrade('attackPower', 150, 1), false);
});


test('migrates an existing schema-v1 save without losing progression or settings', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  const v1 = { ...legacy, schemaVersion: 1 };
  delete v1.progression.permanentUpgrades;
  v1.progression.soulEssence = 275;
  v1.progression.completedRuns = 8;
  v1.progression.unlockedRegionIds = ['cursed-forest', 'forgotten-graveyard'];
  v1.collections.characterMastery['cursed-hunter'] = 3;
  v1.settings.musicVolume = 0.35;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v1));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 275);
  assert.equal(result.data.progression.completedRuns, 8);
  assert.deepEqual(result.data.progression.unlockedRegionIds, ['cursed-forest', 'forgotten-graveyard']);
  assert.equal(result.data.collections.characterMastery['cursed-hunter'], 3);
  assert.equal(result.data.settings.musicVolume, 0.35);
  assert.deepEqual(result.data.progression.permanentUpgrades, {});
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('migrates a schema-v1 backup when the primary save is corrupt', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  const v1 = { ...legacy, schemaVersion: 1 };
  delete v1.progression.permanentUpgrades;
  v1.progression.soulEssence = 91;
  storage.setItem(SAVE_STORAGE_KEY, '{bad');
  storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(v1));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'recovered');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 91);
  assert.deepEqual(result.data.progression.permanentUpgrades, {});
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('rejects negative, non-finite, fractional, mismatched and unknown permanent upgrade purchases', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 500;
  manager.save(data);
  const before = storage.getItem(SAVE_STORAGE_KEY);

  assert.equal(manager.purchasePermanentUpgrade('maxHealth', -1, 5), false);
  assert.equal(manager.purchasePermanentUpgrade('maxHealth', Number.NaN, 5), false);
  assert.equal(manager.purchasePermanentUpgrade('maxHealth', 50.5, 5), false);
  assert.equal(manager.purchasePermanentUpgrade('maxHealth', 51, 5), false);
  assert.equal(manager.purchasePermanentUpgrade('unknown-upgrade', 1, 5), false);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), before);
  assert.equal(manager.load().data.progression.soulEssence, 500);
});


test('permanent upgrade respec refunds net investment, charges the fee and persists atomically', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 100;
  data.progression.permanentUpgrades = { maxHealth: 2, attackPower: 1 };
  manager.save(data);

  const quote = manager.getPermanentUpgradeRespecQuote();
  assert.deepEqual(quote, { totalInvested: 225, fee: 23, refund: 202 });
  assert.equal(manager.respecPermanentUpgrades(), true);

  const loaded = new SaveManager(storage, fixedNow).load();
  assert.equal(loaded.data.progression.soulEssence, 302);
  assert.deepEqual(loaded.data.progression.permanentUpgrades, {});
  assert.equal(new SaveManager(storage, fixedNow).getPermanentUpgradeLevel('maxHealth'), 0);
  assert.equal(JSON.parse(storage.getItem(SAVE_BACKUP_KEY)).progression.permanentUpgrades.maxHealth, 2);
});

test('respec refuses a profile without investments and does not change either save key', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  manager.save(createInitialSaveData(fixedNow()));
  const beforePrimary = storage.getItem(SAVE_STORAGE_KEY);
  const beforeBackup = storage.getItem(SAVE_BACKUP_KEY);

  assert.equal(manager.respecPermanentUpgrades(), false);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), beforePrimary);
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), beforeBackup);
});

test('respec deducts its fee from the recovered investment, even with no loose essence', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 0;
  data.progression.permanentUpgrades = { maxHealth: 1 };
  manager.save(data);

  assert.equal(manager.respecPermanentUpgrades(), true);
  const loaded = new SaveManager(storage, fixedNow).load();
  assert.equal(loaded.data.progression.soulEssence, 45);
  assert.deepEqual(loaded.data.progression.permanentUpgrades, {});
});

test('respec does not alter the current save if storage rejects the write', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 100;
  data.progression.permanentUpgrades = { maxHealth: 1 };
  manager.save(data);
  const beforePrimary = storage.getItem(SAVE_STORAGE_KEY);
  const beforeBackup = storage.getItem(SAVE_BACKUP_KEY);
  const originalSetItem = storage.setItem.bind(storage);
  let failPrimaryWrite = true;
  storage.setItem = (key, value) => {
    if (key === SAVE_STORAGE_KEY && failPrimaryWrite) {
      failPrimaryWrite = false;
      throw new Error('Simulated storage write failure');
    }
    originalSetItem(key, value);
  };

  assert.equal(manager.respecPermanentUpgrades(), false);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), beforePrimary);
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), beforePrimary);
});


test('migrates schema-v2 primary and backup saves to schema v9 without losing progress', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  const v2 = { ...legacy, schemaVersion: 2 };
  delete v2.collections.relicIds;
  delete v2.progression.equippedRelicIds;
  delete v2.collections.craftingMaterials;
  delete v2.collections.unlockedWeaponVariantIds;
  delete v2.collections.unlockedMasteryRewardIds;
  v2.progression.soulEssence = 314;
  v2.progression.permanentUpgrades = { maxHealth: 2, attackPower: 1 };
  v2.collections.characterMastery['cursed-hunter'] = 7;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v2));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 314);
  assert.deepEqual(result.data.progression.permanentUpgrades, { maxHealth: 2, attackPower: 1 });
  assert.deepEqual(result.data.progression.equippedRelicIds, []);
  assert.deepEqual(result.data.collections.relicIds, []);
  assert.equal(result.data.collections.characterMastery['cursed-hunter'], 7);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('equips only owned relics, rejects duplicates and enforces three slots', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.collections.relicIds = ['matriarch-seed', 'forest-heart', 'king-crown-shard', 'grave-lament'];
  manager.save(data);

  assert.equal(manager.equipRelic('not-owned'), false);
  assert.equal(manager.equipRelic('matriarch-seed'), true);
  assert.equal(manager.equipRelic('matriarch-seed'), false);
  assert.equal(manager.equipRelic('forest-heart'), true);
  assert.equal(manager.equipRelic('king-crown-shard'), true);
  assert.equal(manager.equipRelic('grave-lament'), false);
  assert.deepEqual(manager.load().data.progression.equippedRelicIds, ['matriarch-seed', 'forest-heart', 'king-crown-shard']);
  assert.equal(manager.equipRelic('grave-lament', 1), true);
  assert.deepEqual(manager.load().data.progression.equippedRelicIds, ['matriarch-seed', 'grave-lament', 'king-crown-shard']);
  assert.equal(manager.unequipRelic('grave-lament'), true);
  assert.deepEqual(manager.load().data.progression.equippedRelicIds, ['matriarch-seed', 'king-crown-shard']);
});

test('relic acquisition is idempotent and never overwrites unrelated profile progress', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 99;
  data.progression.permanentUpgrades = { maxHealth: 1 };
  manager.save(data);

  assert.equal(manager.acquireRelics(['matriarch-seed', 'matriarch-seed', 'unknown-relic']), true);
  assert.equal(manager.acquireRelics(['matriarch-seed']), true);
  const loaded = manager.load().data;
  assert.deepEqual(loaded.collections.relicIds, ['matriarch-seed']);
  assert.equal(loaded.progression.soulEssence, 99);
  assert.deepEqual(loaded.progression.permanentUpgrades, { maxHealth: 1 });
});


test('recovers and migrates a schema-v2 backup when the primary save is corrupt', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  const v2 = { ...legacy, schemaVersion: 2 };
  delete v2.collections.relicIds;
  delete v2.progression.equippedRelicIds;
  delete v2.collections.craftingMaterials;
  delete v2.collections.unlockedWeaponVariantIds;
  delete v2.collections.unlockedMasteryRewardIds;
  v2.progression.soulEssence = 188;
  v2.progression.permanentUpgrades = { attackPower: 2 };
  storage.setItem(SAVE_STORAGE_KEY, '{bad');
  storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(v2));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'recovered');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 188);
  assert.deepEqual(result.data.progression.permanentUpgrades, { attackPower: 2 });
  assert.deepEqual(result.data.progression.equippedRelicIds, []);
  assert.deepEqual(result.data.collections.relicIds, []);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});


test('loads a valid schema-v11 profile with relic fields and all permanent upgrades', () => {
  const storage = new MemoryStorage();
  const data = createInitialSaveData(fixedNow());
  data.progression.permanentUpgrades = { maxHealth: 2, attackPower: 2, moveSpeed: 1, armor: 3, xpBonus: 2, rerolls: 2 };
  data.progression.equippedRelicIds = [];
  data.collections.relicIds = [];
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'loaded');
  assert.deepEqual(result.data.progression.permanentUpgrades, data.progression.permanentUpgrades);
});


test('migrates schema-v3 saves while preserving relic ownership and equipped relics', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.collections.relicIds = ['matriarch-seed', 'forest-heart'];
  legacy.progression.equippedRelicIds = ['matriarch-seed'];
  const v3 = { ...legacy, schemaVersion: 3 };
  delete v3.collections.craftingMaterials;
  delete v3.collections.unlockedWeaponVariantIds;
  delete v3.collections.unlockedMasteryRewardIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v3));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.deepEqual(result.data.collections.relicIds, ['matriarch-seed', 'forest-heart']);
  assert.deepEqual(result.data.progression.equippedRelicIds, ['matriarch-seed']);
  assert.deepEqual(result.data.collections.craftingMaterials, {});
  assert.deepEqual(result.data.collections.unlockedWeaponVariantIds, []);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('crafts a weapon variant atomically, consumes exact costs and persists its unlock', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 500;
  data.collections.craftingMaterials['living-root'] = 3;
  manager.save(data);

  assert.equal(manager.craftRecipe('recipe-verdant-spread'), true);
  const crafted = manager.load().data;
  assert.equal(crafted.progression.soulEssence, 360);
  assert.equal(crafted.collections.craftingMaterials['living-root'], 1);
  assert.deepEqual(crafted.collections.unlockedWeaponVariantIds, ['briar-seed-verdant-variant']);
  assert.equal(manager.craftRecipe('recipe-verdant-spread'), false);
  assert.equal(manager.load().data.progression.soulEssence, 360);
});

test('crafting refuses unknown recipes, insufficient materials and insufficient essence without spending anything', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.soulEssence = 100;
  data.collections.craftingMaterials['living-root'] = 1;
  manager.save(data);

  assert.equal(manager.craftRecipe('missing-recipe'), false);
  assert.equal(manager.craftRecipe('recipe-verdant-spread'), false);
  const unchanged = manager.load().data;
  assert.equal(unchanged.progression.soulEssence, 100);
  assert.deepEqual(unchanged.collections.craftingMaterials, { 'living-root': 1 });
  assert.deepEqual(unchanged.collections.unlockedWeaponVariantIds, []);
});


test('migrates schema-v4 saves while preserving crafting materials and permanent weapon variants', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.collections.craftingMaterials['living-root'] = 2;
  legacy.collections.unlockedWeaponVariantIds = ['briar-seed-verdant-variant'];
  const v4 = { ...legacy, schemaVersion: 4 };
  delete v4.collections.unlockedMasteryRewardIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v4));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.deepEqual(result.data.collections.craftingMaterials, { 'living-root': 2 });
  assert.deepEqual(result.data.collections.unlockedWeaponVariantIds, ['briar-seed-verdant-variant']);
  assert.deepEqual(result.data.collections.unlockedMasteryRewardIds, []);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('schema-v6 migration initializes achievement and collection fields without losing relic ownership', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.collections.relicIds = ['matriarch-seed'];
  const v6 = { ...legacy, schemaVersion: 6 };
  delete v6.collections.achievementProgress;
  delete v6.collections.completedAchievementIds;
  delete v6.collections.achievementPlayedCharacterIds;
  delete v6.collections.achievementExploredRegionIds;
  delete v6.collections.discoveredEnemyIds;
  delete v6.collections.discoveredWeaponIds;
  delete v6.collections.discoveredCharacterBioIds;
  delete v6.collections.completedCollectionIds;
  delete v6.collections.unlockedCollectionRewardIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v6));
  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.deepEqual(result.data.collections.relicIds, ['matriarch-seed']);
  assert.deepEqual(result.data.collections.achievementProgress, {});
  assert.deepEqual(result.data.collections.completedAchievementIds, []);
  assert.deepEqual(result.data.collections.discoveredEnemyIds, []);
  assert.deepEqual(result.data.collections.discoveredWeaponIds, []);
  assert.deepEqual(result.data.collections.completedCollectionIds, []);
});


test('migrates schema-v8 saves to v11 and preserves progression and collection data', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.progression.soulEssence = 321;
  legacy.collections.discoveredLoreIds = ['cursed-forest-lore'];
  const v8 = { ...legacy, schemaVersion: 8 };
  delete v8.story;
  delete v8.progression.newGamePlusLevel;
  delete v8.progression.completedEndingIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v8));
  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 321);
  assert.deepEqual(result.data.collections.discoveredLoreIds, ['cursed-forest-lore']);
  assert.deepEqual(result.data.story.quests, {});
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('rejects malformed quest records without overwriting the last valid save', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const valid = createInitialSaveData(fixedNow());
  manager.save(valid);
  const invalid = { ...valid, story: { ...valid.story, quests: { 'unknown-quest': { status: 'active', objectiveProgress: {}, chosenChoiceId: null, outcomeId: null } } } };
  assert.throws(() => manager.save(invalid), /invalid save/i);
  assert.equal(manager.load().data.story.quests['unknown-quest'], undefined);
});


test('migrates schema-v9 story saves to v11 without losing branch choices or progression', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const v9 = createInitialSaveData(fixedNow());
  v9.progression.soulEssence = 777;
  v9.story.endingId = 'ending-mended-veil';
  v9.story.quests['castle-veil-heir'] = {
    status: 'completed',
    objectiveProgress: { 'decode-regent-seals': 3, 'face-veil-echoes': 3 },
    chosenChoiceId: 'mend-the-veil',
    outcomeId: 'veil-mended'
  };
  delete v9.story.completedEndingId;
  delete v9.progression.newGamePlusLevel;
  delete v9.progression.completedEndingIds;
  v9.schemaVersion = 9;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v9));
  const result = manager.load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 777);
  assert.equal(result.data.story.endingId, 'ending-mended-veil');
  assert.equal(result.data.story.quests['castle-veil-heir'].chosenChoiceId, 'mend-the-veil');
  assert.equal(result.data.story.completedEndingId, null);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});

test('migrates schema-v10 ending completion into the persistent New Game+ history', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.progression.soulEssence = 432;
  legacy.story.completedEndingId = 'ending-mended-veil';
  const v10 = { ...legacy, schemaVersion: 10 };
  delete v10.progression.newGamePlusLevel;
  delete v10.progression.completedEndingIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v10));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 11);
  assert.equal(result.data.progression.soulEssence, 432);
  assert.equal(result.data.progression.newGamePlusLevel, 0);
  assert.deepEqual(result.data.progression.completedEndingIds, ['ending-mended-veil']);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 11);
});
