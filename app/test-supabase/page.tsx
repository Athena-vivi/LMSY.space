'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Check environment variables
      const envCheck = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      };

      // Test 2: Try to fetch from Supabase
      const { data, error } = await supabase.from('gallery').select('id').limit(1);

      setResult({
        env: envCheck,
        success: !error,
        error: error?.message,
        data: data,
      });
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const testDNS = async () => {
    try {
      const response = await fetch('https://vbhsoarhnwoqwprmhqie.supabase.co/rest/v1/', {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      setResult({
        dnsSuccess: true,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (err: any) {
      setResult({
        dnsSuccess: false,
        error: err.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

        <div className="space-y-2">
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Supabase Connection'}
          </button>

          <button
            onClick={testDNS}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
          >
            Test DNS Resolution
          </button>
        </div>

        {result && (
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Environment check:</p>
          <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...</p>
          <p>Has Key: {!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
