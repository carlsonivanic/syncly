import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/api';
import { useAuthStore } from '../store/authStore';
import Layout from '../components/Layout';

export default function Dashboard() {
  const merchant = useAuthStore((s) => s.merchant);
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  const synced = transactions.filter((t) => t.syncedAt !== null).length;
  const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
  const uniqueUsers = new Set(transactions.map((t) => t.userId).filter(Boolean)).size;

  const quickActions = [
    {
      to: '/new-transaction',
      title: 'New Transaction',
      description: 'Submit a purchase and generate a sync code for the customer.',
      icon: '🧾',
      color: 'bg-violet-50 border-violet-200',
    },
    {
      to: '/scan-order',
      title: 'Scan Order QR',
      description: "Scan a customer's repeat-order QR to auto-fill their order.",
      icon: '📷',
      color: 'bg-sky-50 border-sky-200',
    },
    {
      to: '/transactions',
      title: 'View Transactions',
      description: 'Browse all transactions and see which customers have synced.',
      icon: '📋',
      color: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {merchant?.name}
          </h1>
          <p className="text-gray-500 mt-1">Here's an overview of your Syncly activity.</p>
        </div>

        {/* API key */}
        <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Your API Key
            </p>
            <code className="text-green-400 text-sm font-mono break-all">
              {merchant?.apiKey}
            </code>
          </div>
          <button
            onClick={() => merchant && navigator.clipboard.writeText(merchant.apiKey)}
            className="shrink-0 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-7 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Transactions" value={transactions.length} />
            <StatCard label="Synced by Customers" value={synced} />
            <StatCard label="Unique Customers" value={uniqueUsers} />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`block rounded-xl border p-5 hover:shadow-sm transition-shadow ${action.color}`}
              >
                <span className="text-3xl mb-3 block">{action.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700">Recent Transactions</h2>
              <Link to="/transactions" className="text-sm text-primary-500 hover:underline">
                View all
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.user?.name ?? tx.user?.phone ?? (
                        <span className="text-gray-400 italic">Not synced</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${parseFloat(tx.total).toFixed(2)}
                    </p>
                    {tx.syncedAt && (
                      <span className="text-xs text-emerald-600 font-medium">Synced</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}
