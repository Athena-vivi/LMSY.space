'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GalleryItem, Project } from '@/lib/supabase';

export interface MilestoneImage {
  id: string;
  image_url: string;
  year: string;
  caption: string | null;
  caption_i18n?: { en?: string | null; zh?: string | null; th?: string | null } | null;
  tag: string | null;
}

export interface ChronicleEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: 'gallery' | 'project' | 'custom';
  image_ids: string[];
  image_url?: string | null;
  chronicle_visible?: boolean;
  project_id?: string | null;
}

export interface VaultData {
  gallery: GalleryItem[];
  projects: Project[];
  events: ChronicleEvent[];
  milestones: Record<string, MilestoneImage>;
}

export interface VaultDebug {
  gallery_count: number;
  projects_count: number;
  chronicle_count: number;
  milestone_count: number;
  first_gallery_id: string | null;
  first_gallery_project_id: string | null;
}

async function getAuthHeaders() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Admin session not available');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export function useVaultData() {
  const [data, setData] = useState<VaultData>({
    gallery: [],
    projects: [],
    events: [],
    milestones: {},
  });
  const [debug, setDebug] = useState<VaultDebug | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/vault', {
        cache: 'no-store',
        credentials: 'include',
        headers,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.details || payload.error || 'Failed to fetch Asset Vault data');
      }

      setData(payload.data);
      setDebug(payload.debug || null);
    } catch (err) {
      console.error('[VAULT_DATA] Failed to fetch vault data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vault data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, debug, loading, error, refetch: fetchData };
}
