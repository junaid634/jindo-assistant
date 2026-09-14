'use client';

const CHIPS = [
  'assign Prepare weekly ops digest to Ali',
  "today's report",
  'text Ali his tasks',
  "what's on the calendar",
];

export function SuggestionChips({
  onPick,
  visible,
}: {
  onPick: (text: string) => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {CHIPS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-200 hover:border-emerald-500/60 hover:text-emerald-200"
        >
          {c}
        </button>
      ))}
    </div>
  );
}
