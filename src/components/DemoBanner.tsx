'use client';

export function DemoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-100 text-xs sm:text-sm px-3 py-2 text-center">
      Demo mode — add keys in <code className="font-mono">.env</code> to go live. Fixtures are fake, not live monday data.
    </div>
  );
}
