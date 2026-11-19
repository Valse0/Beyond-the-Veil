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
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 2);
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
  assert.equal(result.data.schemaVersion, 2);
  assert.equal(result.data.progression.soulEssence, 275);
  assert.equal(result.data.progression.completedRuns, 8);
  assert.deepEqual(result.data.progression.unlockedRegionIds, ['cursed-forest', 'forgotten-graveyard']);
  assert.equal(result.data.collections.characterMastery['cursed-hunter'], 3);
  assert.equal(result.data.settings.musicVolume, 0.35);
  assert.deepEqual(result.data.progression.permanentUpgrades, {});
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 2);
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
  assert.equal(result.data.schemaVersion, 2);
  assert.equal(result.data.progression.soulEssence, 91);
  assert.deepEqual(result.data.progression.permanentUpgrades, {});
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 2);
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
  manager.save(createInitialSaveData(fixedNow));
  const beforePrimary = storage.getItem(SAVE_STORAGE_KEY);
  const beforeBackup = storage.getItem(SAVE_BACKUP_KEY);

  assert.equal(manager.respecPermanentUpgrades(), false);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), beforePrimary);
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), beforePrimary);
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
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), beforeBackup);
});
