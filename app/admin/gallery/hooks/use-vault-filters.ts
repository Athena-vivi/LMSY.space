/**
 * useVaultFilters Hook
 *
 * Filter logic for different vault views
 */

'use client';

import { useMemo } from 'react';
import type { VaultData, ChronicleEvent } from './use-vault-data';
import { groupEventsByYear } from '../utils';

export interface VaultFilters {
  searchQuery: string;
  filterTag: string;
}

export function useVaultFilters(
  data: VaultData,
  activeTab: 'all' | 'chronicle' | 'editorial' | 'milestones',
  filters: VaultFilters
) {
  const { searchQuery, filterTag } = filters;

  return useMemo(() => {
    switch (activeTab) {
      case 'all':
        return filterAllAssets(data, searchQuery, filterTag);

      case 'chronicle':
        return filterChronicle(data, searchQuery);

      case 'editorial':
        return filterEditorial(data, searchQuery);

      case 'milestones':
        return { milestones: data.milestones, gallery: data.gallery };

      default:
        return data.gallery;
    }
  }, [data, activeTab, searchQuery, filterTag]);
}

// Filter All Assets (gallery + editorial projects)
function filterAllAssets(
  data: VaultData,
  searchQuery: string,
  filterTag: string
) {
  const { gallery, projects } = data;

  // Filter gallery items
  let filteredGallery = gallery;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredGallery = filteredGallery.filter(item => {
      const captionMatch = item.caption?.toLowerCase().includes(query);
      const tagMatch = item.tag?.toLowerCase().includes(query);
      const catalogMatch = item.catalog_id?.toLowerCase().includes(query);
      return captionMatch || tagMatch || catalogMatch;
    });
  }
  if (filterTag) {
    filteredGallery = filteredGallery.filter(item => item.tag === filterTag);
  }

  // Filter editorial projects
  let filteredProjects = projects.filter(p =>
    p.category === 'editorial' || p.category === 'series'
  );
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredProjects = filteredProjects.filter(p => {
      const titleMatch = p.title?.toLowerCase().includes(query);
      const descMatch = p.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }

  return { gallery: filteredGallery, projects: filteredProjects };
}

// Filter Chronicle events - returns shape expected by ChronicleView
function filterChronicle(data: VaultData, searchQuery: string) {
  let filtered = data.events;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(event => {
      const titleMatch = event.title?.toLowerCase().includes(query);
      const descMatch = event.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }

  return { events: filtered, gallery: data.gallery };
}

// Filter Editorial projects - returns shape expected by EditorialView
function filterEditorial(data: VaultData, searchQuery: string) {
  let filtered = data.projects.filter(p =>
    p.category === 'editorial' || p.category === 'series'
  );

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      const titleMatch = p.title?.toLowerCase().includes(query);
      const descMatch = p.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }

  return { projects: filtered };
}
