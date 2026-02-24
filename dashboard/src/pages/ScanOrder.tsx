import React, { useState } from 'react';
import { scanOrderQR } from '../services/api';
import Layout from '../components/Layout';
import type { OrderScanResult, TransactionItem } from '../types';

export default function ScanOrder() {
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OrderScanResult | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!payload.trim()) {
      setError('Paste the QR payload or scan the QR code.');
      return;
    }

    setLoading(true);
    try {
      const res = await scanOrderQR(payload.trim());
      setResult(res);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to scan order QR.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPayload('');
    setError('');
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Order QR</h1>
          <p className="text-gray-500 text-sm mt-1">
            When a returning customer shows you their Syncly QR code, scan it here to
            auto-fill their repeat order.
          </p>
        </div>

        {!result ? (
          <>
            {/* In production: replace this textarea with a real QR camera scanner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 font-medium">
                Camera scanner coming soon
              </p>
              <p className="text-xs text-amber-700 mt-1">
                In production, integrate a webcam QR scanner here (e.g. react-qr-reader).
                For now, paste the raw QR payload from the customer's app.
              </p>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  QR Payload (paste or scan)
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={4}
                  placeholder='{"type":"order","code":"ABC12345","merchantId":"..."}'
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Processing…' : 'Process Order'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-emerald-800">Order loaded!</p>
                <p className="text-sm text-emerald-700">
                  Customer: {result.order.user.name ?? result.order.user.phone}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Order Items</h2>
              <div className="space-y-2">
                {(result.order.items as TransactionItem[]).map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">×{item.quantity}</p>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)} ea</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold">
                <span>Total</span>
                <span>
                  ${(result.order.items as TransactionItem[])
                    .reduce((sum, i) => sum + i.price * i.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Code generated {new Date(result.order.createdAt).toLocaleString()}
            </p>

            <button
              onClick={handleReset}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
