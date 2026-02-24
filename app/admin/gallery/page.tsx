'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { VaultHeader } from './components/vault-header';
import { VaultTabs } from './components/vault-tabs';
import { VaultFilterBar } from './components/vault-filter-bar';
import { AllAssetsView } from './components/views/all-assets-view';
import { ChronicleView } from './components/views/chronicle-view';
import { EditorialView } from './components/views/editorial-view';
import { MilestonesView } from './components/views/milestones-view';
import { useVaultData } from './hooks/use-vault-data';
import { useVaultFilters } from './hooks/use-vault-filters';
import { VAULT_TABS, type VaultTabId } from './constants';

/**
 * Asset Vault Page
 *
 * Unified content management for:
 * - All Assets: Gallery images and editorial projects
 * - Chronicle: Timeline events
 * - Editorial: Magazine projects
 * - Milestones: Homepage timeline images
 *
 * Supports ?tab= URL parameter for direct tab linking.
 */
export default function AssetVaultPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as VaultTabId | null;

  const [activeTab, setActiveTab] = useState<VaultTabId>(
    tabParam && VAULT_TABS.some(t => t.id === tabParam) ? tabParam : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Update tab when URL param changes
  useEffect(() => {
    if (tabParam && VAULT_TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch all vault data in parallel
  const { data, loading } = useVaultData();

  // Apply filters based on active tab - use 'as' to narrow the type for each view
  const filteredData = useVaultFilters(data, activeTab, { searchQuery, filterTag });

  // Get unique tags for the filter dropdown
  const uniqueTags = useMemo(() => {
    return [...new Set(data.gallery.map(img => img.tag).filter((tag): tag is string => Boolean(tag)))];
  }, [data.gallery]);

  return (
    <div className="space-y-6">
      {/* Header - dynamic based on active tab */}
      <VaultHeader activeTab={activeTab} />

      {/* Tab Navigation */}
      <VaultTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        data={data}
      />

      {/* Search and Filter Bar */}
      <VaultFilterBar
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        uniqueTags={uniqueTags}
      />

      {/* Content Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'all' && (
          <AllAssetsView key="all" data={filteredData as { gallery: any[]; projects: any[] }} loading={loading} />
        )}
        {activeTab === 'chronicle' && (
          <ChronicleView key="chronicle" data={filteredData as unknown as { events: any[]; gallery: any[] }} loading={loading} />
        )}
        {activeTab === 'editorial' && (
          <EditorialView key="editorial" data={filteredData as unknown as { projects: any[] }} loading={loading} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesView key="milestones" data={filteredData as unknown as { milestones: Record<string, any>; gallery: any[] }} loading={loading} />
        )}
      </AnimatePresence>
    </div>
  );
}
