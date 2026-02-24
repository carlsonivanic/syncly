import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/api';
import Layout from '../components/Layout';
import type { TransactionItem } from '../types';

export default function Transactions() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 mt-1">{transactions.length} total transactions</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-lg font-medium">No transactions yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first transaction using "New Transaction".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {tx.user?.name ?? tx.user?.phone ?? (
                          <span className="text-gray-400 italic">Not yet synced</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()} · {tx.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {tx.syncedAt ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        Synced
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    )}
                    <span className="text-base font-bold text-gray-900">
                      ${parseFloat(tx.total).toFixed(2)}
                    </span>
                    <span className="text-gray-300 text-lg">{expanded === tx.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded === tx.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Items
                    </p>
                    <div className="space-y-1.5">
                      {(tx.items as TransactionItem[]).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.quantity}× {item.name}
                            {item.sku && (
                              <span className="text-gray-400 ml-1">({item.sku})</span>
                            )}
                          </span>
                          <span className="text-gray-600">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span>${parseFloat(tx.total).toFixed(2)}</span>
                    </div>
                    {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Metadata
                        </p>
                        <pre className="text-xs text-gray-500 bg-white rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(tx.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
