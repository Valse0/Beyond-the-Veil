import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { SAVE_STORAGE_KEY } from '../.test-dist/src/systems/save/save-storage.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const fixedNow = () => '2026-11-19T12:00:00.000Z';

test('creates, updates, activates and deletes a named profile for its own hunter', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.collections.relicIds = ['matriarch-seed', 'forest-heart'];
  manager.save(data);

  const id = manager.createEquipmentProfile('cursed-hunter', {
    name: '  Spirit build  ',
    startingWeaponId: 'gravecleaver',
    startingPassiveId: 'graveplate',
    relicIds: ['matriarch-seed']
  });
  assert.ok(id);
  assert.equal(manager.getEquipmentProfiles('cursed-hunter')[0].name, 'Spirit build');
  assert.equal(manager.getActiveEquipmentProfile('cursed-hunter'), null);
  assert.equal(manager.activateEquipmentProfile('cursed-hunter', id), true);
  assert.equal(manager.getActiveEquipmentProfile('cursed-hunter').startingWeaponId, 'gravecleaver');

  assert.equal(manager.updateEquipmentProfile('cursed-hunter', id, {
    name: '  Grave guard ',
    startingWeaponId: 'iron-bell',
    relicIds: ['forest-heart']
  }), true);
  const updated = manager.getActiveEquipmentProfile('cursed-hunter');
  assert.equal(updated.name, 'Grave guard');
  assert.equal(updated.startingWeaponId, 'iron-bell');
  assert.deepEqual(updated.relicIds, ['forest-heart']);

  assert.equal(manager.deleteEquipmentProfile('cursed-hunter', id), true);
  assert.equal(manager.getActiveEquipmentProfile('cursed-hunter'), null);
  assert.deepEqual(manager.getEquipmentProfiles('cursed-hunter'), []);
});

test('limits each hunter to five profiles and prevents duplicate names', () => {
  const manager = new SaveManager(new MemoryStorage(), fixedNow);
  for (let i = 1; i <= 5; i++) {
    assert.ok(manager.createEquipmentProfile('cursed-hunter', {
      name: 'Build ' + i,
      startingWeaponId: 'veil-bolt',
      startingPassiveId: 'soul-vessel'
    }));
  }
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Build 6',
    startingWeaponId: 'veil-bolt',
    startingPassiveId: 'soul-vessel'
  }), null);
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: ' build 1 ',
    startingWeaponId: 'veil-bolt',
    startingPassiveId: 'soul-vessel'
  }), null);
});

test('validates catalogs, owned relics, uniqueness and the three-relic limit', () => {
  const manager = new SaveManager(new MemoryStorage(), fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.collections.relicIds = ['matriarch-seed', 'forest-heart', 'king-crown-shard', 'grave-lament'];
  manager.save(data);

  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Unknown weapon', startingWeaponId: 'missing-weapon', startingPassiveId: 'soul-vessel'
  }), null);
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Unknown passive', startingWeaponId: 'veil-bolt', startingPassiveId: 'missing-passive'
  }), null);
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Unowned relic', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel', relicIds: ['not-owned']
  }), null);
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Duplicate relic', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel', relicIds: ['matriarch-seed', 'matriarch-seed']
  }), null);
  assert.equal(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Too many relics', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel',
    relicIds: ['matriarch-seed', 'forest-heart', 'king-crown-shard', 'grave-lament']
  }), null);
  assert.ok(manager.createEquipmentProfile('cursed-hunter', {
    name: 'Three relics', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel',
    relicIds: ['matriarch-seed', 'forest-heart', 'king-crown-shard']
  }));
});

test('profiles are isolated by character and locked hunters cannot create profiles', () => {
  const manager = new SaveManager(new MemoryStorage(), fixedNow);
  const profileId = manager.createEquipmentProfile('cursed-hunter', {
    name: 'Hunter default', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel'
  });
  assert.ok(profileId);
  assert.equal(manager.createEquipmentProfile('black-knight', {
    name: 'Knight default', startingWeaponId: 'gravecleaver', startingPassiveId: 'graveplate'
  }), null);
  assert.equal(manager.getEquipmentProfiles('black-knight').length, 0);
});

test('active profiles remain independent per character and survive a reload', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.unlockedCharacterIds.push('black-knight');
  data.collections.relicIds = ['matriarch-seed'];
  manager.save(data);

  const hunter = manager.createEquipmentProfile('cursed-hunter', {
    name: 'Hunter', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel'
  });
  const knight = manager.createEquipmentProfile('black-knight', {
    name: 'Knight', startingWeaponId: 'iron-bell', startingPassiveId: 'graveplate', relicIds: ['matriarch-seed']
  });
  assert.ok(hunter && knight);
  assert.equal(manager.activateEquipmentProfile('cursed-hunter', hunter), true);
  assert.equal(manager.activateEquipmentProfile('black-knight', knight), true);

  const reloaded = new SaveManager(storage, fixedNow);
  assert.equal(reloaded.getActiveEquipmentProfile('cursed-hunter').id, hunter);
  assert.equal(reloaded.getActiveEquipmentProfile('black-knight').id, knight);
  assert.equal(JSON.parse(storage.getItem(SAVE_STORAGE_KEY)).schemaVersion, 9);
});

test('rejects invalid profile updates without changing the saved loadout', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const id = manager.createEquipmentProfile('cursed-hunter', {
    name: 'Safe', startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel'
  });
  assert.ok(id);
  const before = storage.getItem(SAVE_STORAGE_KEY);
  assert.equal(manager.updateEquipmentProfile('cursed-hunter', id, { startingWeaponId: 'unknown' }), false);
  assert.equal(manager.updateEquipmentProfile('cursed-hunter', id, { name: '   ' }), false);
  assert.equal(storage.getItem(SAVE_STORAGE_KEY), before);
});

test('schema-v5 migration adds empty profile collections without losing existing progress', () => {
  const storage = new MemoryStorage();
  const legacy = createInitialSaveData(fixedNow());
  legacy.progression.soulEssence = 412;
  legacy.progression.equippedRelicIds = ['matriarch-seed'];
  legacy.collections.relicIds = ['matriarch-seed', 'forest-heart'];
  legacy.collections.characterMastery['cursed-hunter'] = 27;
  const v5 = { ...legacy, schemaVersion: 5 };
  delete v5.progression.equipmentProfiles;
  delete v5.progression.activeEquipmentProfileIds;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(v5));

  const result = new SaveManager(storage, fixedNow).load();
  assert.equal(result.status, 'migrated');
  assert.equal(result.data.schemaVersion, 9);
  assert.equal(result.data.progression.soulEssence, 412);
  assert.deepEqual(result.data.progression.equippedRelicIds, ['matriarch-seed']);
  assert.deepEqual(result.data.collections.relicIds, ['matriarch-seed', 'forest-heart']);
  assert.equal(result.data.collections.characterMastery['cursed-hunter'], 27);
  assert.deepEqual(result.data.progression.equipmentProfiles, {});
  assert.deepEqual(result.data.progression.activeEquipmentProfileIds, {});
});

test('schema 0 through 4 migrations initialize profile collections and preserve known progress', () => {
  for (const version of [0, 1, 2, 3, 4]) {
    const storage = new MemoryStorage();
    const data = createInitialSaveData(fixedNow());
    data.progression.soulEssence = 200 + version;
    data.progression.equippedRelicIds = [];
    const legacy = { ...data, schemaVersion: version };
    if (version === 0) delete legacy.progression.permanentUpgrades;
    if (version <= 2) {
      delete legacy.collections.relicIds;
      delete legacy.progression.equippedRelicIds;
    }
    if (version <= 3) {
      delete legacy.collections.craftingMaterials;
      delete legacy.collections.unlockedWeaponVariantIds;
    }
    if (version <= 4) delete legacy.collections.unlockedMasteryRewardIds;
    delete legacy.progression.equipmentProfiles;
    delete legacy.progression.activeEquipmentProfileIds;
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(legacy));
    const result = new SaveManager(storage, fixedNow).load();
    assert.equal(result.status, 'migrated', 'schema ' + version);
    assert.equal(result.data.schemaVersion, 9);
    assert.equal(result.data.progression.soulEssence, 200 + version);
    assert.deepEqual(result.data.progression.equipmentProfiles, {});
    assert.deepEqual(result.data.progression.activeEquipmentProfileIds, {});
  }
});

test('save validation rejects profiles with unowned relics or dangling active IDs', () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, fixedNow);
  const data = createInitialSaveData(fixedNow());
  data.progression.equipmentProfiles = {
    'cursed-hunter': [{
      id: 'profile-1', characterId: 'cursed-hunter', name: 'Invalid relic',
      startingWeaponId: 'veil-bolt', startingPassiveId: 'soul-vessel', relicIds: ['matriarch-seed']
    }]
  };
  data.progression.activeEquipmentProfileIds = { 'cursed-hunter': 'missing' };
  assert.throws(() => manager.save(data), /invalid save/i);
});
