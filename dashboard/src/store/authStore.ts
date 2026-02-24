import { create } from 'zustand';
import type { Merchant } from '../types';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  setAuth: (token: string, merchant: Merchant) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  merchant: null,

  setAuth: (token, merchant) => {
    localStorage.setItem('merchant_token', token);
    localStorage.setItem('merchant_data', JSON.stringify(merchant));
    set({ token, merchant });
  },

  clearAuth: () => {
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_data');
    set({ token: null, merchant: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('merchant_token');
    const merchantStr = localStorage.getItem('merchant_data');
    if (token && merchantStr) {
      try {
        set({ token, merchant: JSON.parse(merchantStr) as Merchant });
      } catch {
        // corrupted storage — clear it
        localStorage.removeItem('merchant_token');
        localStorage.removeItem('merchant_data');
      }
    }
  },
}));
