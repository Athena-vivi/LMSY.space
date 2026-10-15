/**
 * Route-level loading fallback.
 *
 * Rendered while a server component segment is streaming. Kept intentionally
 * lightweight (no animation library) so it appears immediately.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-white/15 border-t-lmsy-yellow animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground font-mono tracking-widest uppercase">
          Loading archive
        </p>
      </div>
    </div>
  );
}
