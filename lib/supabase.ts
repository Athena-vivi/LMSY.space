import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log environment variables (only in browser)
if (typeof window !== 'undefined') {
  console.log('[Supabase] Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 30) + '...',
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase client is not initialized. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase client with additional options for better browser compatibility
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'lmsy-space-admin',
    },
  },
});

// Database types
export interface Member {
  id: string;
  name: string;
  nickname: string;
  birthday: string | null;
  height: string | null;
  bio: string | null;
  avatar_url: string | null;
  ig_handle: string | null;
  x_handle: string | null;
  weibo_handle: string | null;
  xhs_handle: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  category: 'series' | 'music' | 'magazine';
  release_date: string | null;
  description: string | null;
  cover_url: string | null;
  watch_url: string | null;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  tag: string | null;
  is_featured: boolean;
  catalog_id: string | null;  // LMSY-2026-XXX
  is_editorial: boolean;  // Curatorial special feature
  curator_note: string | null;  // Markdown-formatted note
  created_at: string;
}

export interface Schedule {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  link: string | null;
  created_at: string;
}

// Helper function to get public URL from Supabase Storage
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
