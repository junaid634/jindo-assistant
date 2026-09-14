'use client';

import { FormEvent, useState } from 'react';

export function PinGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError('Wrong PIN');
        return;
      }
      onUnlocked();
    } catch {
      setError('Could not verify PIN');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-zinc-50 mb-1">Jindo</h1>
        <p className="text-sm text-zinc-400 mb-4">Enter PIN to continue</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 text-zinc-50 outline-none focus:border-emerald-500"
          placeholder="PIN"
        />
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 font-medium text-white"
        >
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
