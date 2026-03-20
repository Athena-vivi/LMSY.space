'use client';

export function TabButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: 'yellow' | 'blue';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClasses =
    color === 'yellow'
      ? 'border-lmsy-yellow/40 bg-lmsy-yellow/10 text-lmsy-yellow'
      : 'border-lmsy-blue/40 bg-lmsy-blue/10 text-lmsy-blue';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? activeClasses
          : 'border-white/10 bg-black/20 text-white/55 hover:border-white/20 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}
