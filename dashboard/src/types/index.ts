export interface Merchant {
  id: string;
  name: string;
  email: string;
  category: string | null;
  apiKey: string;
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
  total: string;
  currency: string;
  items: TransactionItem[];
  metadata: Record<string, unknown> | null;
  syncedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string } | null;
}

export interface SyncResult {
  transaction: {
    id: string;
    total: string;
    currency: string;
    items: TransactionItem[];
    createdAt: string;
  };
  sync: {
    code: string;
    expiresAt: string;
    qrDataUrl: string;
    qrPayload: string;
  };
}

export interface OrderScanResult {
  order: {
    id: string;
    user: { id: string; name: string | null; phone: string };
    items: TransactionItem[];
    createdAt: string;
  };
}
