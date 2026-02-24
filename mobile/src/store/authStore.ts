import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token, user) => {
    await AsyncStorage.multiSet([
      ['auth_token', token],
      ['auth_user', JSON.stringify(user)],
    ]);
    set({ token, user });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    set({ token: null, user: null });
  },

  loadFromStorage: async () => {
    try {
      const [[, token], [, userStr]] = await AsyncStorage.multiGet([
        'auth_token',
        'auth_user',
      ]);
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) as User });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
