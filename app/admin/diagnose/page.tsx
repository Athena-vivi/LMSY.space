'use client';

import { useState, useEffect } from 'react';
import { BackButton } from '@/components/back-button';

interface DiagnosticResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: any;
  timestamp: string;
}

export default function DiagnosePage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const timestamp = new Date().toISOString();
    const newResults: DiagnosticResult[] = [];

    // Test 1: DB Connection (lmsy_archive.profiles)
    newResults.push({
      name: 'DB: lmsy_archive.profiles SELECT',
      status: 'pending',
      timestamp,
    });

    try {
      const response = await fetch('/api/admin/diagnose/db');
      const data = await response.json();
      newResults[0] = {
        ...newResults[0],
        status: data.success ? 'success' : 'error',
        data: data.data || undefined,
        error: data.error || data.rawError,
      };
    } catch (error: any) {
      newResults[0] = {
        ...newResults[0],
        status: 'error',
        error: {
          message: error?.message || 'Fetch failed',
          raw: error,
        },
      };
    }

    // Test 2: R2 Connection (HeadBucket) - 通过 API 路由
    newResults.push({
      name: `R2: HeadBucket ${process.env.NEXT_PUBLIC_R2_BUCKET_NAME || '(hidden)'}`,
      status: 'pending',
      timestamp,
    });

    try {
      const response = await fetch('/api/admin/diagnose/r2');

      if (!response.ok) {
        const errorText = await response.text();
        newResults[1] = {
          ...newResults[1],
          status: 'error',
          error: {
            message: `HTTP ${response.status}: ${response.statusText}`,
            details: errorText.substring(0, 500), // First 500 chars of response
          },
        };
      } else {
        const data = await response.json();
        newResults[1] = {
          ...newResults[1],
          status: data.success ? 'success' : 'error',
          data: data.data || undefined,
          error: data.error || data.rawError,
        };
      }
    } catch (error: any) {
      newResults[1] = {
        ...newResults[1],
        status: 'error',
        error: {
          message: error?.message || 'Fetch failed',
          raw: error,
        },
      };
    }

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <BackButton />
        </div>

        <div className="mb-8">
          <h1 className="font-serif text-4xl text-white/90 mb-2">System Diagnostics</h1>
          <p className="text-white/40 font-mono text-sm">Raw error output for debugging</p>
        </div>

        <div className="mb-6">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-6 py-3 bg-lmsy-yellow/20 hover:bg-lmsy-yellow/30 text-lmsy-yellow border border-lmsy-yellow/50 rounded-lg font-mono text-sm transition-colors disabled:opacity-50"
          >
            {isRunning ? 'RUNNING DIAGNOSTICS...' : 'RE-RUN DIAGNOSTICS'}
          </button>
        </div>

        <div className="space-y-6">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`border-2 rounded-lg p-6 font-mono text-sm ${
                result.status === 'success'
                  ? 'border-green-500/50 bg-green-500/5'
                  : result.status === 'error'
                  ? 'border-red-500/50 bg-red-500/5'
                  : 'border-yellow-500/50 bg-yellow-500/5'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white/90">{result.name}</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      result.status === 'success'
                        ? 'bg-green-500 text-black'
                        : result.status === 'error'
                        ? 'bg-red-500 text-black'
                        : 'bg-yellow-500 text-black animate-pulse'
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                  <span className="text-white/30 text-xs">{result.timestamp}</span>
                </div>
              </div>

              {result.status === 'error' && result.error && (
                <div className="space-y-4">
                  <div className="bg-red-950/50 border border-red-500/30 rounded p-4">
                    <div className="text-red-400 font-bold mb-2">ERROR MESSAGE:</div>
                    <div className="text-white/90">{result.error.message || JSON.stringify(result.error)}</div>
                  </div>

                  {result.error.raw && (
                    <div className="bg-black/50 border border-white/10 rounded p-4 overflow-x-auto">
                      <div className="text-white/40 font-bold mb-2">RAW ERROR OBJECT:</div>
                      <pre className="text-red-300 text-xs whitespace-pre-wrap">
                        {JSON.stringify(result.error.raw, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.error.code && (
                    <div className="bg-black/50 border border-white/10 rounded p-4">
                      <div className="text-white/40 font-bold mb-2">ERROR CODE:</div>
                      <div className="text-yellow-400">{result.error.code}</div>
                    </div>
                  )}

                  {result.error.stack && (
                    <div className="bg-black/50 border border-white/10 rounded p-4 overflow-x-auto">
                      <div className="text-white/40 font-bold mb-2">STACK TRACE:</div>
                      <pre className="text-white/60 text-xs whitespace-pre-wrap">
                        {result.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {result.status === 'success' && result.data && (
                <div className="bg-green-950/30 border border-green-500/30 rounded p-4">
                  <div className="text-green-400 font-bold mb-2">SUCCESS DATA:</div>
                  <pre className="text-white/80 text-xs whitespace-pre-wrap">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center py-20">
            <div className="text-white/30 font-mono text-sm animate-pulse">Initializing diagnostics...</div>
          </div>
        )}
      </div>
    </div>
  );
}
