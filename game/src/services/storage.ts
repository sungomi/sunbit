import type { GameState } from '../types/game';

/**
 * Storage adapter abstraction so web (localStorage) can be swapped
 * cleanly for Capacitor Preferences / React Native AsyncStorage when porting to mobile.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const webLocalStorageAdapter: StorageAdapter = {
  async getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore quota errors in restricted webviews
    }
  },
  async removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

const STORAGE_KEY = 'ssalmeok_god_save_v1';

export class GameStorageService {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter = webLocalStorageAdapter) {
    this.adapter = adapter;
  }

  async load(): Promise<GameState | null> {
    const raw = await this.adapter.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }

  async save(state: GameState): Promise<void> {
    await this.adapter.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async reset(): Promise<void> {
    await this.adapter.removeItem(STORAGE_KEY);
  }
}

export const gameStorage = new GameStorageService();
