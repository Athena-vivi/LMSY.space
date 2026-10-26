'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/supabase';

export interface MilestoneImage {
  id: string;
  image_url: string;
  year: string;
  caption: string | null;
  caption_i18n?: { en?: string | null; zh?: string | null; th?: string | null } | null;
  tag: string | null;
}

/** A row pinned to a fixed homepage door (five entries + two soul doors). */
export interface PortalSlotRow {
  id: string;
  image_url: string;
  blur_data: string | null;
  portal_slot: string | null;
  interview_slot: string | null;
}

export interface VaultData {
  projects: Project[];
  /** At most one row per door; 7 slots exist, most may be empty. */
  portals: PortalSlotRow[];
  milestones: Record<string, MilestoneImage>;
  /** Every tag in use, for the filter dropdown. */
  tags: string[];
  counts: {
    gallery: number;
    projects: number;
    editorial: number;
    portals: number;
    milestones: number;
  };
}

export interface VaultDebug {
  projects_count: number;
  projects_truncated?: boolean;
  /** Real row count in gallery_assets; what the ALL ASSETS badge prints. */
  gallery_total?: number;
  portal_count?: number;
  milestone_count?: number;
  tag_count?: number;
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

const EMPTY_DATA: VaultData = {
  projects: [],
  portals: [],
  milestones: {},
  tags: [],
  counts: { gallery: 0, projects: 0, editorial: 0, portals: 0, milestones: 0 },
};

/**
 * Vault-wide data that is NOT the image list: projects, the fixed slots, tags
 * and counts. The images themselves are paged by useVaultAssets.
 */
export function useVaultData() {
  const [data, setData] = useState<VaultData>(EMPTY_DATA);
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
