import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { createTransaction } from '../services/api';
import Layout from '../components/Layout';
import type { SyncResult, TransactionItem } from '../types';

interface ItemRow {
  name: string;
  price: string;
  quantity: string;
  sku: string;
}

const emptyItem = (): ItemRow => ({ name: '', price: '', quantity: '1', sku: '' });

export default function NewTransaction() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SyncResult | null>(null);

  const setItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const parsedItems: TransactionItem[] = items
    .filter((item) => item.name.trim() && parseFloat(item.price) >= 0)
    .map((item) => ({
      name: item.name.trim(),
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      sku: item.sku.trim() || undefined,
    }));

  const total = parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (parsedItems.length === 0) {
      setError('Add at least one item with a name.');
      return;
    }

    setLoading(true);
    try {
      const res = await createTransaction({ total, currency, items: parsedItems });
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to create transaction.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setItems([emptyItem()]);
    setError('');
  };

  if (result) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Transaction created</h1>
            <p className="text-gray-500 text-sm mt-1">
              Show the customer the code or QR below to sync their receipt.
            </p>
          </div>

          {/* Code display */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Sync Code
              </p>
              <p className="text-5xl font-black tracking-[0.3em] text-primary-500">
                {result.sync.code}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Expires {new Date(result.sync.expiresAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Or scan QR
              </p>
              <div className="flex justify-center">
                <div className="p-4 bg-white border border-gray-100 rounded-xl inline-block">
                  <QRCodeSVG value={result.sync.qrPayload} size={200} />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Transaction Summary
            </p>
            {result.transaction.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">
                  {(item as TransactionItem).quantity}× {(item as TransactionItem).name}
                </span>
                <span className="text-gray-600">
                  ${((item as TransactionItem).price * (item as TransactionItem).quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between font-bold text-sm">
              <span>Total</span>
              <span>${parseFloat(result.transaction.total).toFixed(2)} {currency}</span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            New Transaction
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Transaction</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter the purchase details. A sync code will be generated for the customer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                + Add item
              </button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">SKU (opt)</div>
                <div className="col-span-1" />
              </div>

              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => setItem(i, 'name', e.target.value)}
                    required
                  />
                  <input
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => setItem(i, 'price', e.target.value)}
                    required
                  />
                  <input
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="1"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => setItem(i, 'quantity', e.target.value)}
                  />
                  <input
                    className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="SKU-001"
                    value={item.sku}
                    onChange={(e) => setItem(i, 'sku', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="col-span-1 text-gray-300 hover:text-red-400 disabled:opacity-0 text-lg font-bold transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Total preview */}
            <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500">Total</span>
              <div className="flex items-center gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>SGD</option>
                  <option>PHP</option>
                </select>
                <span className="text-xl font-black text-gray-900">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || parsedItems.length === 0}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors text-base"
          >
            {loading ? 'Creating…' : 'Create Transaction & Get Sync Code'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
