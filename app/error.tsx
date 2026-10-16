'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * Shows a neutral message and a retry action. Internal error details are never
 * rendered to the visitor — only logged to the console in development.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[route-error]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-lmsy-yellow/70 mb-4">
          Transmission interrupted
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
          Something went wrong
        </h1>
        <p className="text-ink-2 mb-8">
          This part of the archive could not be loaded. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
