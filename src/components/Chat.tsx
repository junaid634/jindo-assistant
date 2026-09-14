'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { DemoBanner } from './DemoBanner';
import { PinGate } from './PinGate';
import { SuggestionChips } from './SuggestionChips';

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  smsLog?: { to: string; content: string; demo: boolean; ok: boolean }[];
};

type Status = {
  demo: boolean;
  pinRequired: boolean;
  userName?: string;
  monday?: boolean;
  httpsms?: boolean;
  calendar?: boolean;
};

export function Chat() {
  const [status, setStatus] = useState<Status | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        if (!s.pinRequired) setUnlocked(true);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hi${s.userName ? ` ${s.userName.split(' ')[0]}` : ''} — I’m Jindo. Ask me about tasks, calendar, or say “text someone their tasks”.`,
          },
        ]);
      })
      .catch(() => {
        setStatus({ demo: true, pinRequired: false });
        setUnlocked(true);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setUnlocked(false);
        setBusy(false);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || data.error || 'No reply',
          smsLog: data.outboundSms,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', content: 'Network error — try again.' },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  if (status?.pinRequired && !unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} />;
  }

  const showChips = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <DemoBanner show={Boolean(status?.demo)} />
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Jindo</h1>
          <p className="text-[11px] text-zinc-500">Ops assistant · Asia/Karachi</p>
        </div>
        <div className="flex gap-1.5 text-[10px]">
          <Pill on={status?.monday} label="monday" />
          <Pill on={status?.httpsms} label="SMS" />
          <Pill on={status?.calendar} label="Cal" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-3 max-w-2xl w-full mx-auto">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-md'
              }`}
            >
              {m.content}
              {m.smsLog?.map((s, i) => (
                <div
                  key={i}
                  className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950/60 p-2 text-xs text-zinc-300"
                >
                  <div className="font-medium text-emerald-300">
                    Outbound SMS {s.ok ? '✓' : '✗'} {s.demo ? '(demo)' : ''}
                  </div>
                  <div>to {s.to}</div>
                  <div className="mt-1 opacity-80 whitespace-pre-wrap">{s.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {busy && (
          <div className="text-xs text-zinc-500 px-1">Jindo is thinking…</div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto pt-2">
          <SuggestionChips visible={showChips} onPick={(t) => void send(t)} />
          <form onSubmit={onSubmit} className="flex gap-2 p-3 pt-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Command Jindo…"
              className="flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none focus:border-emerald-500 max-h-32"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="shrink-0 self-end rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-3 text-sm font-medium text-white min-w-[4.5rem]"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Pill({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 border ${
        on
          ? 'border-emerald-600/50 text-emerald-300 bg-emerald-950/40'
          : 'border-zinc-700 text-zinc-500'
      }`}
    >
      {label}
    </span>
  );
}
