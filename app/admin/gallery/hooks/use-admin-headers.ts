/**
 * Admin request headers
 *
 * Every admin API call needs the Supabase access token, and each view used to
 * rebuild it by hand. One hook keeps the header shape identical everywhere.
 */

'use client';

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminHeaders() {
  return useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, []);
}
