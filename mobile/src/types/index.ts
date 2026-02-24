export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  category: string | null;
}

export interface TransactionItem {
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

export interface Transaction {
  id: string;
  merchantId: string;
  userId: string | null;
  total: string; // Decimal comes as string from JSON
  currency: string;
  items: TransactionItem[];
  metadata: Record<string, unknown> | null;
  syncedAt: string | null;
  createdAt: string;
  merchant: Merchant;
}

export interface FrequentItem {
  sku: string;
  name: string;
  count: number;
  lastPrice: number;
}

export interface MerchantVisit {
  merchant: Merchant;
  visitCount: number;
  lastVisit: string;
}

export interface OrderResult {
  code: string;
  merchantName: string;
  items: TransactionItem[];
  expiresAt: string;
  qrDataUrl: string;
  qrPayload: string;
}

// Navigation param types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Sync: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  MerchantHistory: { merchant: Merchant };
  OrderQR: { merchant: Merchant; items: TransactionItem[] };
};
