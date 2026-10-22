/**
 * useVaultFilters Hook
 *
 * Filter logic for the vault views that still hold their rows in memory.
 *
 * The ALL tab is not here: its search, tag and project filters run in the
 * database and its rows arrive one page at a time (useVaultAssets), so there
 * is nothing left to filter in the browser.
 */

'use client';

import { useMemo } from 'react';
import type { VaultData } from './use-vault-data';

export function useVaultFilters(data: VaultData, searchQuery: string) {
  return useMemo(
    () => ({
      editorial: { projects: filterEditorial(data, searchQuery) },
      // Portal and portrait slots pick from the whole vault; their pickers have
      // their own search, so the page-level filter would only hide choices.
      portals: { gallery: data.gallery },
      milestones: { milestones: data.milestones, gallery: data.gallery },
      portraits: { gallery: data.gallery },
    }),
    [data, searchQuery]
  );
}

// Filter Editorial projects - returns shape expected by EditorialView
function filterEditorial(data: VaultData, searchQuery: string) {
  let filtered = data.projects.filter((p) => p.category === 'editorial');

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => {
      const titleMatch = p.title?.toLowerCase().includes(query);
      const descMatch = p.description?.toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }

  return filtered;
}
