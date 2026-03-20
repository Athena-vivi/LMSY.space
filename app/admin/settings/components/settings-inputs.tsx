'use client';

export function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-white/35">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-white/90 focus:border-lmsy-yellow/40 focus:outline-none"
      />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-white/35">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="custom-scrollbar w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white/90 focus:border-lmsy-yellow/40 focus:outline-none"
      />
    </div>
  );
}
