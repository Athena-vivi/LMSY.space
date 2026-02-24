/**
 * useVaultData Hook
 *
 * Unified data fetching for Asset Vault
 */

'use client';

import { useState, useEffect } from 'react';
import type { GalleryItem, Project } from '@/lib/supabase';

export interface MilestoneImage {
  id: string;
  image_url: string;
  year: string;
  caption: string | null;
  tag: string | null;
}

export interface ChronicleEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: 'gallery' | 'project' | 'custom';
  image_ids: string[];
}

export interface VaultData {
  gallery: GalleryItem[];
  projects: Project[];
  events: ChronicleEvent[];
  milestones: Record<string, MilestoneImage>;
}

export function useVaultData() {
  const [data, setData] = useState<VaultData>({
    gallery: [],
    projects: [],
    events: [],
    milestones: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[VAULT_DATA] 📡 Fetching all vault data...');

      const [galleryRes, projectsRes, eventsRes, milestonesRes] = await Promise.all([
        fetch('/api/admin/gallery', { cache: 'no-store' }),
        fetch('/api/admin/projects', { cache: 'no-store' }),
        fetch('/api/admin/chronicle', { cache: 'no-store' }),
        fetch('/api/admin/gallery/milestone', { cache: 'no-store' }),
      ]);

      // Parse gallery
      if (galleryRes.ok) {
        const galleryResult = await galleryRes.json();
        if (galleryResult.success) {
          setData(prev => ({ ...prev, gallery: galleryResult.data || [] }));
          console.log('[VAULT_DATA] ✅ Gallery:', galleryResult.data?.length || 0);
        }
      }

      // Parse projects
      if (projectsRes.ok) {
        const projectsResult = await projectsRes.json();
        if (projectsResult.success) {
          setData(prev => ({ ...prev, projects: projectsResult.projects || [] }));
          console.log('[VAULT_DATA] ✅ Projects:', projectsResult.projects?.length || 0);
        }
      }

      // Parse events
      if (eventsRes.ok) {
        const eventsResult = await eventsRes.json();
        if (eventsResult.success) {
          setData(prev => ({ ...prev, events: eventsResult.events || [] }));
          console.log('[VAULT_DATA] ✅ Events:', eventsResult.events?.length || 0);
        }
      }

      // Parse milestones
      if (milestonesRes.ok) {
        const milestonesResult = await milestonesRes.json();
        if (milestonesResult.success && milestonesResult.data) {
          const milestonesMap: Record<string, MilestoneImage> = {};
          milestonesResult.data.forEach((m: MilestoneImage) => {
            milestonesMap[m.year] = m;
          });
          setData(prev => ({ ...prev, milestones: milestonesMap }));
          console.log('[VAULT_DATA] ✅ Milestones:', Object.keys(milestonesMap).length);
        }
      }

    } catch (err) {
      console.error('[VAULT_DATA] ❌ Fetch error:', err);
      setError('Failed to fetch vault data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}
