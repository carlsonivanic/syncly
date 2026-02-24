import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Transaction,
  FrequentItem,
  MerchantVisit,
  OrderResult,
  TransactionItem,
} from '../types';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  phone: string;
  name?: string;
  email?: string;
  password: string;
}) {
  const res = await api.post<{ token: string; user: { id: string; phone: string; name: string | null } }>(
    '/api/auth/user/register',
    data,
  );
  return res.data;
}

export async function loginUser(phone: string, password: string) {
  const res = await api.post<{ token: string; user: { id: string; phone: string; name: string | null } }>(
    '/api/auth/user/login',
    { phone, password },
  );
  return res.data;
}

// ─── Receipt Sync ─────────────────────────────────────────────────────────────

/** Sync a receipt using a code (typed or from QR scan) */
export async function syncReceipt(code: string) {
  const res = await api.post<{ message: string; transaction: Transaction }>(
    '/api/user/sync',
    { code },
  );
  return res.data;
}

// ─── Transaction History ──────────────────────────────────────────────────────

export async function getTransactions(merchantId?: string) {
  const res = await api.get<{ transactions: Transaction[] }>('/api/user/transactions', {
    params: merchantId ? { merchantId } : {},
  });
  return res.data.transactions;
}

export async function getMerchantVisits() {
  const res = await api.get<{ merchants: MerchantVisit[] }>(
    '/api/user/transactions/merchants',
  );
  return res.data.merchants;
}

export async function getFrequentItems(merchantId?: string) {
  const res = await api.get<{ items: FrequentItem[] }>(
    '/api/user/transactions/frequent',
    { params: merchantId ? { merchantId } : {} },
  );
  return res.data.items;
}

// ─── Repeat Orders ────────────────────────────────────────────────────────────

export async function generateOrderQR(merchantId: string, items: TransactionItem[]) {
  const res = await api.post<{ order: OrderResult }>('/api/user/orders/generate', {
    merchantId,
    items,
  });
  return res.data.order;
}
