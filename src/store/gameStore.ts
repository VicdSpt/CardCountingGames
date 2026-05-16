import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GameType = 'rikiki' | 'yahtzee' | '5000';

export interface Player {
  id: string;
  name: string;
}

export interface SavedGame {
  id: string;
  gameType: GameType;
  players: Player[];
  createdAt: number;
  updatedAt: number;
  state: any;
}

interface GameStore {
  savedGames: SavedGame[];
  loadGames: () => Promise<void>;
  saveGame: (game: SavedGame) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'cardscore_games';

export const useGameStore = create<GameStore>((set, get) => ({
  savedGames: [],

  loadGames: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        set({ savedGames: JSON.parse(raw) });
      }
    } catch (e) {
      console.error('Failed to load games', e);
    }
  },

  saveGame: async (game: SavedGame) => {
    const games = get().savedGames;
    const existing = games.findIndex((g) => g.id === game.id);
    let updated: SavedGame[];
    if (existing >= 0) {
      updated = [...games];
      updated[existing] = game;
    } else {
      updated = [game, ...games];
    }
    set({ savedGames: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteGame: async (id: string) => {
    const updated = get().savedGames.filter((g) => g.id !== id);
    set({ savedGames: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
}));
