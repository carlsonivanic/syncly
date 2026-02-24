import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginMerchant, registerMerchant } from '../services/api';
import { useAuthStore } from '../store/authStore';

type Mode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let token: string;
      let merchant: ReturnType<typeof useAuthStore.getState>['merchant'];

      if (mode === 'login') {
        const res = await loginMerchant(form.email, form.password);
        token = res.token;
        merchant = res.merchant;
      } else {
        const res = await registerMerchant({
          name: form.name,
          email: form.email,
          category: form.category || undefined,
          password: form.password,
        });
        token = res.token;
        merchant = res.merchant;
      }

      if (merchant) {
        setAuth(token, merchant);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-primary-500">Syncly</h1>
          <p className="text-gray-500 mt-1">Merchant Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <input
                  type="text"
                  placeholder="Business name *"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
                <input
                  type="text"
                  placeholder="Category (e.g. Coffee, Retail)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.category}
                  onChange={set('category')}
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email address *"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.email}
              onChange={set('email')}
              required
            />
            <input
              type="password"
              placeholder="Password *"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
            />

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
