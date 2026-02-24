import axios from 'axios';
import type { Merchant, Transaction, SyncResult, OrderScanResult, TransactionItem } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({ baseURL: BASE_URL });

// Attach stored token or API key
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginMerchant(email: string, password: string) {
  const res = await api.post<{ token: string; merchant: Merchant }>(
    '/api/auth/merchant/login',
    { email, password },
  );
  return res.data;
}

export async function registerMerchant(data: {
  name: string;
  email: string;
  category?: string;
  password: string;
}) {
  const res = await api.post<{ token: string; merchant: Merchant }>(
    '/api/auth/merchant/register',
    data,
  );
  return res.data;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions() {
  const res = await api.get<{ transactions: Transaction[] }>('/api/merchant/transactions');
  return res.data.transactions;
}

export async function createTransaction(data: {
  total: number;
  currency?: string;
  items: TransactionItem[];
  metadata?: Record<string, unknown>;
}): Promise<SyncResult> {
  const res = await api.post<SyncResult>('/api/merchant/transactions', data);
  return res.data;
}

// ─── Order Scanning ───────────────────────────────────────────────────────────

export async function scanOrderQR(qrPayload: string): Promise<OrderScanResult> {
  const res = await api.post<OrderScanResult>('/api/merchant/orders/scan', { qrPayload });
  return res.data;
}
