import type { SaveStorage } from './save-types.js';

export const SAVE_STORAGE_KEY = 'beyond-the-veil.save';
export const SAVE_BACKUP_KEY = 'beyond-the-veil.save.backup';

export class BrowserSaveStorage implements SaveStorage {
  constructor(private readonly storage: Storage) {}

  getItem(key: string): string | null { return this.storage.getItem(key); }
  setItem(key: string, value: string): void { this.storage.setItem(key, value); }
  removeItem(key: string): void { this.storage.removeItem(key); }
}
